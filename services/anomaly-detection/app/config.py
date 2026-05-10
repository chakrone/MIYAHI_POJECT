"""
MIYAHI Anomaly Detection Service

Consumes meter readings from Redis Streams, applies rolling Z-score
and Isolation Forest for real-time leak/anomaly detection.
Publishes anomaly flags back to Redis and persists to TimescaleDB.
"""
import os

# ── External connections ──
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
TIMESCALE_URL = os.getenv(
    "TIMESCALE_URL",
    "postgresql+psycopg://miyahi:miyahi_ts_dev_2026@localhost:5433/miyahi_ts"
)

# ── Redis Stream config ──
READINGS_STREAM = "meter-readings-stream"
ANOMALY_STREAM  = "anomaly-events-stream"
CONSUMER_GROUP  = "anomaly-detection-group"
CONSUMER_NAME   = "anomaly-consumer-1"

# ── Detection thresholds ──
ZSCORE_WINDOW      = 30          # rolling window size
ZSCORE_THRESHOLD   = 3.0         # standard deviations
ISOLATION_RETRAIN  = 300          # retrain after N new readings per meter
ISOLATION_CONTAMINATION = 0.05   # expected anomaly fraction

# ── API ──
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8090"))
