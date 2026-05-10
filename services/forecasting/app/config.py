"""
MIYAHI Forecasting Service configuration.
"""
import os

TIMESCALE_URL = os.getenv(
    "TIMESCALE_URL",
    "postgresql+psycopg://miyahi:miyahi_ts_dev_2026@localhost:5433/miyahi_ts"
)

API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8091"))

# Forecast settings
DEFAULT_FORECAST_DAYS = 7
MAX_FORECAST_DAYS = 30
MIN_HISTORY_POINTS = 5  # min data points needed for a model
