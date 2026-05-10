"""
MIYAHI Forecasting Service

Provides consumption forecasting using exponential smoothing.
Runs a scheduled nightly job to generate predictions, and exposes
REST endpoints for querying forecasts.
"""
import sys
import os
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager

import numpy as np
import pandas as pd
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from apscheduler.schedulers.background import BackgroundScheduler

from app.config import (
    TIMESCALE_URL, API_HOST, API_PORT,
    DEFAULT_FORECAST_DAYS, MAX_FORECAST_DAYS, MIN_HISTORY_POINTS
)

# ── Fix Windows console encoding ──
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

engine = create_engine(TIMESCALE_URL)
scheduler = BackgroundScheduler()


def get_meter_ids() -> list[str]:
    """Get all active meter IDs from TimescaleDB."""
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT DISTINCT meter_id FROM meter_readings"
        )).fetchall()
    return [row[0] for row in rows]


def get_hourly_consumption(meter_id: str, days_back: int = 30) -> pd.DataFrame:
    """Fetch hourly aggregated flow_rate for a meter."""
    since = datetime.now(timezone.utc) - timedelta(days=days_back)
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT time_bucket('1 hour', time) AS hour,
                   AVG(flow_rate) AS avg_flow,
                   SUM(flow_rate) / 60.0 AS volume_m3
            FROM meter_readings
            WHERE meter_id = :meter_id AND time > :since
            GROUP BY hour
            ORDER BY hour
        """), {"meter_id": meter_id, "since": since}).fetchall()

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows, columns=["hour", "avg_flow", "volume_m3"])
    df["hour"] = pd.to_datetime(df["hour"], utc=True)
    df = df.set_index("hour")
    return df


def exponential_smoothing_forecast(series: pd.Series, periods: int, alpha: float = 0.3) -> dict:
    """
    Simple exponential smoothing with confidence intervals.
    Returns dict with predictions, lower_bound, upper_bound.
    """
    values = series.dropna().values.astype(float)
    if len(values) < 5:
        return None

    # Fit: simple exponential smoothing
    level = values[0]
    residuals = []
    for v in values[1:]:
        level = alpha * v + (1 - alpha) * level
        residuals.append(v - level)

    # Forecast: constant level projection
    std_residual = np.std(residuals) if residuals else 0
    predictions = []
    for i in range(periods):
        ci = 1.96 * std_residual * np.sqrt(1 + i * 0.1)  # widening CI
        predictions.append({
            "predicted": round(float(level), 4),
            "lower_bound": round(float(level - ci), 4),
            "upper_bound": round(float(level + ci), 4)
        })

    return predictions


def generate_forecasts():
    """Generate and store forecasts for all meters."""
    print(f"[FORECAST] Starting forecast generation at {datetime.now()}")
    meter_ids = get_meter_ids()

    for meter_id in meter_ids:
        try:
            df = get_hourly_consumption(meter_id, days_back=14)
            if len(df) < MIN_HISTORY_POINTS:
                print(f"  [SKIP] {meter_id}: only {len(df)} data points (need {MIN_HISTORY_POINTS})")
                continue

            predictions = exponential_smoothing_forecast(
                df["avg_flow"], periods=DEFAULT_FORECAST_DAYS * 24
            )
            if not predictions:
                continue

            # Write to TimescaleDB forecasts table
            now = datetime.now(timezone.utc)
            with engine.connect() as conn:
                for i, pred in enumerate(predictions):
                    forecast_time = now + timedelta(hours=i + 1)
                    conn.execute(text("""
                        INSERT INTO forecasts (time, meter_id, predicted_value, lower_bound, upper_bound, generated_at)
                        VALUES (:time, :meter_id, :predicted, :lower, :upper, :generated_at)
                    """), {
                        "time": forecast_time,
                        "meter_id": meter_id,
                        "predicted": pred["predicted"],
                        "lower": pred["lower_bound"],
                        "upper": pred["upper_bound"],
                        "generated_at": now
                    })
                conn.commit()

            print(f"  [OK] {meter_id}: generated {len(predictions)} hourly predictions")

        except Exception as e:
            print(f"  [ERR] {meter_id}: {e}")

    print(f"[FORECAST] Generation complete")


# ── FastAPI App ──

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schedule nightly forecast at 2 AM
    scheduler.add_job(generate_forecasts, "cron", hour=2, minute=0)
    # Also run once at startup after a short delay
    scheduler.add_job(generate_forecasts, "date",
                      run_date=datetime.now() + timedelta(seconds=10))
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="MIYAHI Forecasting Service",
    version="1.0.0",
    lifespan=lifespan
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/api/forecast/{meter_id}")
def get_forecast(
    meter_id: str,
    days: int = Query(DEFAULT_FORECAST_DAYS, ge=1, le=MAX_FORECAST_DAYS)
):
    """Get the latest forecast for a meter."""
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT time, predicted_value, lower_bound, upper_bound, generated_at
                FROM forecasts
                WHERE meter_id = :meter_id
                  AND generated_at = (
                      SELECT MAX(generated_at) FROM forecasts WHERE meter_id = :meter_id
                  )
                ORDER BY time
                LIMIT :limit
            """), {"meter_id": meter_id, "limit": days * 24}).fetchall()

        return {
            "meter_id": meter_id,
            "forecast_hours": len(rows),
            "predictions": [
                {
                    "time": str(row[0]),
                    "predicted_value": row[1],
                    "lower_bound": row[2],
                    "upper_bound": row[3],
                    "generated_at": str(row[4])
                }
                for row in rows
            ]
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/forecast/generate")
def trigger_generation():
    """Manually trigger forecast generation."""
    scheduler.add_job(generate_forecasts, "date",
                      run_date=datetime.now() + timedelta(seconds=1))
    return {"status": "triggered", "message": "Forecast generation started"}


@app.get("/health")
def health():
    return {"status": "up", "service": "forecasting"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=API_HOST, port=API_PORT, reload=False)
