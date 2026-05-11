"""
MIYAHI Weather Correlation Service

Fetches weather data from OpenWeatherMap, stores it in TimescaleDB,
and provides correlation analysis between weather and water consumption.
Falls back to synthetic weather data when no API key is configured.
"""
import sys
import os
import math
import random
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager

import numpy as np
import pandas as pd
import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import create_engine, text
from apscheduler.schedulers.background import BackgroundScheduler

# ── Fix Windows console encoding ──
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# ── Config ──
TIMESCALE_URL = os.getenv(
    "TIMESCALE_URL",
    "postgresql+psycopg://miyahi:miyahi_ts_dev_2026@localhost:5433/miyahi_ts"
)
OWM_API_KEY = os.getenv("OWM_API_KEY", "")  # OpenWeatherMap key
OWM_CITY = os.getenv("OWM_CITY", "Casablanca,MA")
LOCATION = os.getenv("WEATHER_LOCATION", "Casablanca")
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8092"))

engine = create_engine(TIMESCALE_URL)
scheduler = BackgroundScheduler()


def fetch_weather_owm() -> dict | None:
    """Fetch current weather from OpenWeatherMap API."""
    if not OWM_API_KEY:
        return None
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather"
        resp = httpx.get(url, params={
            "q": OWM_CITY,
            "appid": OWM_API_KEY,
            "units": "metric"
        }, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return {
            "temperature": data["main"]["temp"],
            "humidity": data["main"]["humidity"],
            "rainfall_mm": data.get("rain", {}).get("1h", 0.0)
        }
    except Exception as e:
        print(f"[ERR] OpenWeatherMap fetch failed: {e}")
        return None


def generate_synthetic_weather() -> dict:
    """Generate realistic synthetic weather for Casablanca."""
    hour = datetime.now().hour
    # Base temp: 18-28 C with diurnal cycle
    base_temp = 23 + 5 * math.sin((hour - 6) * math.pi / 12)
    temp = base_temp + random.gauss(0, 1.5)
    humidity = 65 + 15 * math.cos(hour * math.pi / 12) + random.gauss(0, 5)
    humidity = max(30, min(100, humidity))
    # Casablanca: ~30 rainy days/year, mostly winter
    rainfall = 0.0
    if random.random() < 0.08:  # ~8% chance
        rainfall = random.expovariate(1 / 2.5)  # avg 2.5mm when it rains
    return {
        "temperature": round(temp, 1),
        "humidity": round(humidity, 1),
        "rainfall_mm": round(rainfall, 2)
    }


def store_weather(weather: dict):
    """Persist weather data to TimescaleDB."""
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO weather_data (time, location, temperature, rainfall_mm, humidity)
                VALUES (NOW(), :location, :temp, :rainfall, :humidity)
            """), {
                "location": LOCATION,
                "temp": weather["temperature"],
                "rainfall": weather["rainfall_mm"],
                "humidity": weather["humidity"]
            })
            conn.commit()
    except Exception as e:
        print(f"[ERR] Failed to store weather: {e}")


def poll_weather():
    """Fetch or generate weather and store it."""
    weather = fetch_weather_owm()
    if weather is None:
        weather = generate_synthetic_weather()
        source = "synthetic"
    else:
        source = "openweathermap"

    store_weather(weather)
    print(f"  [OK] Weather ({source}): {weather['temperature']}C, "
          f"{weather['humidity']}% humidity, {weather['rainfall_mm']}mm rain")


def compute_correlation(meter_id: str, days: int) -> dict:
    """Compute Pearson correlation between weather and water consumption."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    with engine.connect() as conn:
        # Hourly weather
        weather_df = pd.DataFrame(
            conn.execute(text("""
                SELECT time_bucket('1 hour', time) AS hour,
                       AVG(temperature) AS temp,
                       AVG(humidity) AS humidity,
                       SUM(rainfall_mm) AS rainfall
                FROM weather_data
                WHERE location = :location AND time > :since
                GROUP BY hour ORDER BY hour
            """), {"location": LOCATION, "since": since}).fetchall(),
            columns=["hour", "temp", "humidity", "rainfall"]
        )

        # Hourly consumption
        consumption_df = pd.DataFrame(
            conn.execute(text("""
                SELECT time_bucket('1 hour', time) AS hour,
                       AVG(flow_rate) AS avg_flow
                FROM meter_readings
                WHERE meter_id = :meter_id AND time > :since
                GROUP BY hour ORDER BY hour
            """), {"meter_id": meter_id, "since": since}).fetchall(),
            columns=["hour", "avg_flow"]
        )

    if weather_df.empty or consumption_df.empty:
        return {"error": "Insufficient data for correlation"}

    # Merge on hour
    weather_df["hour"] = pd.to_datetime(weather_df["hour"], utc=True)
    consumption_df["hour"] = pd.to_datetime(consumption_df["hour"], utc=True)
    merged = pd.merge(weather_df, consumption_df, on="hour", how="inner")

    if len(merged) < 10:
        return {"error": f"Only {len(merged)} overlapping hours — need at least 10"}

    correlations = {}
    for col in ["temp", "humidity", "rainfall"]:
        vals = merged[[col, "avg_flow"]].dropna()
        if len(vals) >= 10:
            corr = float(np.corrcoef(vals[col].values, vals["avg_flow"].values)[0, 1])
            correlations[col] = round(corr, 4)

    return {
        "meter_id": meter_id,
        "period_days": days,
        "data_points": len(merged),
        "correlations": correlations,
        "interpretation": {
            k: ("positive" if v > 0.3 else "negative" if v < -0.3 else "weak")
            for k, v in correlations.items()
        }
    }


# ── FastAPI App ──

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Poll weather every hour
    scheduler.add_job(poll_weather, "interval", hours=1)
    # Also poll immediately
    scheduler.add_job(poll_weather, "date",
                      run_date=datetime.now() + timedelta(seconds=5))
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="MIYAHI Weather Correlation Service",
    version="1.0.0",
    lifespan=lifespan
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
Instrumentator().instrument(app).expose(app)


@app.get("/api/weather/current")
def current_weather():
    """Get the latest weather reading."""
    try:
        with engine.connect() as conn:
            row = conn.execute(text("""
                SELECT time, location, temperature, rainfall_mm, humidity
                FROM weather_data
                ORDER BY time DESC LIMIT 1
            """)).fetchone()

        if not row:
            return {"error": "No weather data available"}

        return {
            "time": str(row[0]),
            "location": row[1],
            "temperature": row[2],
            "rainfall_mm": row[3],
            "humidity": row[4]
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/weather/correlation/{meter_id}")
def weather_correlation(
    meter_id: str,
    range: str = Query("7d", description="Time range: 1d, 7d, 14d, 30d")
):
    """Correlate weather data with water consumption for a meter."""
    days_map = {"1d": 1, "7d": 7, "14d": 14, "30d": 30}
    days = days_map.get(range, 7)
    return compute_correlation(meter_id, days)


@app.get("/api/weather/history")
def weather_history(
    hours: int = Query(24, ge=1, le=720)
):
    """Get weather history."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT time, temperature, rainfall_mm, humidity
                FROM weather_data
                WHERE time > :since
                ORDER BY time
            """), {"since": since}).fetchall()

        return [
            {"time": str(r[0]), "temperature": r[1], "rainfall_mm": r[2], "humidity": r[3]}
            for r in rows
        ]
    except Exception as e:
        return {"error": str(e)}


@app.get("/health")
def health():
    return {"status": "up", "service": "weather-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=API_HOST, port=API_PORT, reload=False)
