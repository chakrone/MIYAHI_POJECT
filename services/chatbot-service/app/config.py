"""
MIYAHI Chatbot Service — Configuration

Environment-driven settings for API keys, internal service URLs, and model params.
"""

import os

# ──────────────────────────────────────────────
# Gemini API
# ──────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# Fallback model chain — tried in order when the primary model is rate-limited
FALLBACK_MODELS = [
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash",
]

# Retry configuration for 429 rate-limit errors
MAX_RETRIES = 2          # retries per model before trying next fallback
RETRY_BASE_DELAY = 2.0   # seconds, doubles each retry (exponential backoff)

# ──────────────────────────────────────────────
# Internal Service URLs (direct container access, bypasses gateway/JWT)
# ──────────────────────────────────────────────
INGESTION_URL = os.getenv("INGESTION_URL", "http://ingestion-service:8081")
METER_REGISTRY_URL = os.getenv("METER_REGISTRY_URL", "http://meter-registry-service:8082")
ALERT_URL = os.getenv("ALERT_URL", "http://alert-service:8083")
BILLING_URL = os.getenv("BILLING_URL", "http://billing-service:8084")
ANOMALY_URL = os.getenv("ANOMALY_URL", "http://anomaly-detection:8090")
FORECAST_URL = os.getenv("FORECAST_URL", "http://forecasting:8091")
WEATHER_URL = os.getenv("WEATHER_URL", "http://weather-service:8092")

# ──────────────────────────────────────────────
# Service settings
# ──────────────────────────────────────────────
MAX_HISTORY_MESSAGES = 10
REQUEST_TIMEOUT = 5.0  # seconds for internal API calls
