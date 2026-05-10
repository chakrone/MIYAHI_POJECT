"""
MIYAHI Anomaly Detection Service — Main Application

Runs two tasks concurrently:
1. Background thread consuming Redis Streams and detecting anomalies
2. FastAPI server exposing anomaly query endpoints
"""
import sys
import os
import threading
import time
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager

import redis
import numpy as np
from fastapi import FastAPI, Query
from sqlalchemy import create_engine, text

from app.config import (
    REDIS_HOST, REDIS_PORT, TIMESCALE_URL,
    READINGS_STREAM, ANOMALY_STREAM,
    CONSUMER_GROUP, CONSUMER_NAME,
    API_HOST, API_PORT
)
from app.detector import RollingZScore, IsolationForestDetector

# ── Fix Windows console encoding ──
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# ── Globals ──
r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
engine = create_engine(TIMESCALE_URL)
zscore = RollingZScore()
iforest = IsolationForestDetector()

anomaly_log: list[dict] = []  # in-memory recent anomalies
stats = {"readings_processed": 0, "anomalies_detected": 0}
_running = True


def ensure_consumer_group():
    """Create the Redis consumer group if it doesn't exist."""
    try:
        r.xgroup_create(READINGS_STREAM, CONSUMER_GROUP, id="$", mkstream=True)
        print(f"[INIT] Created consumer group: {CONSUMER_GROUP}")
    except redis.exceptions.ResponseError as e:
        if "BUSYGROUP" in str(e):
            print(f"[INIT] Consumer group {CONSUMER_GROUP} already exists")
        else:
            raise


def persist_anomaly(meter_id: str, anomaly_type: str, severity: str,
                    score: float, description: str):
    """Write anomaly flag to TimescaleDB anomaly_flags hypertable."""
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO anomaly_flags (time, meter_id, anomaly_type, severity, score, description)
                VALUES (NOW(), :meter_id, :anomaly_type, :severity, :score, :description)
            """), {
                "meter_id": meter_id,
                "anomaly_type": anomaly_type,
                "severity": severity,
                "score": score,
                "description": description
            })
            conn.commit()
    except Exception as e:
        print(f"[ERR] Failed to persist anomaly: {e}")


def publish_anomaly_event(meter_id: str, anomaly_type: str, severity: str,
                          score: float, description: str):
    """Publish anomaly to Redis Stream for the Alert Service."""
    try:
        r.xadd(ANOMALY_STREAM, {
            "meter_id": meter_id,
            "anomaly_type": anomaly_type,
            "severity": severity,
            "score": str(score),
            "description": description,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        print(f"[ERR] Failed to publish anomaly event: {e}")


def process_reading(data: dict):
    """Run both detection engines on a single reading."""
    meter_id = data.get("meter_id", "unknown")
    try:
        flow = float(data.get("flow_rate", 0))
        pressure = float(data.get("pressure", 0))
        temp = float(data.get("temperature", 0))
    except (ValueError, TypeError):
        return

    stats["readings_processed"] += 1
    detected = False

    # 1. Z-score checks
    for metric, value in [("flow_rate", flow), ("pressure", pressure), ("temperature", temp)]:
        is_anomaly, z = zscore.check(meter_id, metric, value)
        if is_anomaly:
            detected = True
            severity = "critical" if z > 5 else "warning"
            desc = f"Z-score {z} on {metric} (value={value:.2f})"
            record = {
                "meter_id": meter_id, "type": f"zscore_{metric}",
                "severity": severity, "score": z, "description": desc,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            anomaly_log.append(record)
            persist_anomaly(meter_id, f"zscore_{metric}", severity, z, desc)
            publish_anomaly_event(meter_id, f"zscore_{metric}", severity, z, desc)
            print(f"  [!!] ANOMALY [{severity}] {meter_id}: {desc}")

    # 2. Isolation Forest
    is_anomaly, score = iforest.feed(meter_id, flow, pressure, temp)
    if is_anomaly and score < -0.2:
        detected = True
        desc = f"Isolation Forest anomaly (score={score:.4f})"
        record = {
            "meter_id": meter_id, "type": "isolation_forest",
            "severity": "warning", "score": abs(score), "description": desc,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        anomaly_log.append(record)
        persist_anomaly(meter_id, "isolation_forest", "warning", abs(score), desc)
        publish_anomaly_event(meter_id, "isolation_forest", "warning", abs(score), desc)
        print(f"  [!!] ANOMALY [iforest] {meter_id}: {desc}")

    if detected:
        stats["anomalies_detected"] += 1

    # Trim in-memory log
    if len(anomaly_log) > 500:
        del anomaly_log[:200]


def stream_consumer():
    """Background thread: consume Redis Stream readings."""
    ensure_consumer_group()
    print(f"[READY] Anomaly detection consumer running...")

    while _running:
        try:
            results = r.xreadgroup(
                CONSUMER_GROUP, CONSUMER_NAME,
                {READINGS_STREAM: ">"},
                count=50, block=1000
            )
            if not results:
                continue

            for stream_name, messages in results:
                for msg_id, data in messages:
                    process_reading(data)
                    r.xack(READINGS_STREAM, CONSUMER_GROUP, msg_id)

            if stats["readings_processed"] % 100 == 0 and stats["readings_processed"] > 0:
                print(f"  [OK] Processed {stats['readings_processed']} readings, "
                      f"detected {stats['anomalies_detected']} anomalies")

        except Exception as e:
            print(f"[ERR] Consumer error: {e}")
            time.sleep(2)


# ── FastAPI App ──

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _running
    t = threading.Thread(target=stream_consumer, daemon=True)
    t.start()
    yield
    _running = False

app = FastAPI(
    title="MIYAHI Anomaly Detection",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/api/anomalies/{meter_id}")
def get_anomalies(
    meter_id: str,
    range: str = Query("24h", description="Time range: 1h, 6h, 24h, 7d")
):
    """Query anomaly flags from TimescaleDB for a specific meter."""
    hours_map = {"1h": 1, "6h": 6, "24h": 24, "7d": 168}
    hours = hours_map.get(range, 24)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT time, meter_id, anomaly_type, severity, score, description
                FROM anomaly_flags
                WHERE meter_id = :meter_id AND time > :since
                ORDER BY time DESC
                LIMIT 100
            """), {"meter_id": meter_id, "since": since}).fetchall()

        return [
            {
                "time": str(row[0]),
                "meter_id": row[1],
                "anomaly_type": row[2],
                "severity": row[3],
                "score": row[4],
                "description": row[5]
            }
            for row in rows
        ]
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/anomalies/stats")
def anomaly_stats():
    return stats


@app.get("/health")
def health():
    return {"status": "up", "service": "anomaly-detection"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=API_HOST, port=API_PORT, reload=False)
