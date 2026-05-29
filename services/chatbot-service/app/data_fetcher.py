"""
MIYAHI Chatbot Service — Data Fetcher

Calls internal MIYAHI microservices to gather real-time context for
the chatbot's LLM prompts. Each method returns structured data or
None on failure (graceful degradation).
"""

import httpx
from .config import (
    INGESTION_URL, METER_REGISTRY_URL, ALERT_URL,
    BILLING_URL, ANOMALY_URL, FORECAST_URL, WEATHER_URL,
    REQUEST_TIMEOUT,
)


async def _get(url: str) -> dict | list | None:
    """Make a GET request to an internal service. Returns None on any failure."""
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.json()
    except Exception:
        return None


async def get_latest_reading(meter_id: str) -> dict | None:
    """Fetch the most recent sensor reading for a meter."""
    return await _get(f"{INGESTION_URL}/api/readings/{meter_id}/latest")


async def get_readings_stats() -> dict | None:
    """Fetch pipeline stats (processed count, dropped count, active meters)."""
    return await _get(f"{INGESTION_URL}/api/readings/stats")


async def get_readings(meter_id: str, time_range: str = "24h") -> list | None:
    """Fetch readings for a meter within a time range."""
    return await _get(f"{INGESTION_URL}/api/readings/{meter_id}?range={time_range}")


async def get_meters() -> list | None:
    """Fetch all registered meters."""
    return await _get(f"{METER_REGISTRY_URL}/api/meters")


async def get_alerts(unacknowledged: bool = False) -> list | None:
    """Fetch recent alerts."""
    url = f"{ALERT_URL}/api/alerts"
    if unacknowledged:
        url += "?unacknowledged=true"
    return await _get(url)


async def get_billing_estimate(region: str, volume_m3: float) -> dict | None:
    """Calculate billing estimate for a given volume."""
    return await _get(f"{BILLING_URL}/api/billing/calculate?region={region}&volumeM3={volume_m3}")


async def get_billing_config() -> list | None:
    """Fetch billing tier configuration."""
    return await _get(f"{BILLING_URL}/api/billing/config")


async def get_anomalies(meter_id: str, time_range: str = "24h") -> list | None:
    """Fetch anomaly flags for a meter."""
    return await _get(f"{ANOMALY_URL}/api/anomalies/{meter_id}?range={time_range}")


async def get_anomaly_stats() -> dict | None:
    """Fetch anomaly detection statistics."""
    return await _get(f"{ANOMALY_URL}/api/anomalies/stats")


async def get_forecast(meter_id: str, days: int = 7) -> dict | None:
    """Fetch consumption forecast for a meter."""
    return await _get(f"{FORECAST_URL}/api/forecast/{meter_id}?days={days}")


async def get_current_weather() -> dict | None:
    """Fetch current weather data."""
    return await _get(f"{WEATHER_URL}/api/weather/current")


async def get_weather_correlation(meter_id: str) -> dict | None:
    """Fetch weather-consumption correlation for a meter."""
    return await _get(f"{WEATHER_URL}/api/weather/correlation/{meter_id}?range=7d")


async def gather_context(meter_id: str | None = None) -> dict:
    """
    Gather a comprehensive context snapshot for the chatbot.
    Fetches data from all available services.
    """
    context = {}

    # Pipeline stats
    stats = await get_readings_stats()
    if stats:
        context["pipeline"] = stats

    # Meters list
    meters = await get_meters()
    if meters:
        context["meters"] = [
            {"id": m.get("id"), "label": m.get("label"), "status": m.get("status"),
             "zone": m.get("zone", {}).get("name", "unknown")}
            for m in meters
        ]

    # Weather
    weather = await get_current_weather()
    if weather:
        context["weather"] = weather

    # Meter-specific data
    if meter_id:
        latest = await get_latest_reading(meter_id)
        if latest:
            context["latest_reading"] = latest

        # Compute daily usage from 24h readings
        readings_24h = await get_readings(meter_id, "24h")
        if readings_24h and len(readings_24h) >= 2:
            sorted_r = sorted(readings_24h, key=lambda r: r.get("time", ""))
            earliest_vol = sorted_r[0].get("volume", 0)
            latest_vol = sorted_r[-1].get("volume", 0)
            context["daily_usage_m3"] = round(max(0, latest_vol - earliest_vol), 4)
            context["readings_count_24h"] = len(readings_24h)

        anomalies = await get_anomalies(meter_id)
        if anomalies:
            context["anomalies_24h"] = len(anomalies)
            context["recent_anomalies"] = anomalies[:5]

        forecast = await get_forecast(meter_id)
        if forecast:
            preds = forecast.get("predictions", [])
            if preds:
                context["forecast_next_24h"] = [
                    {"time": p["time"], "value": p["predicted_value"]}
                    for p in preds[:24]
                ]

        # Billing estimate
        daily_usage = context.get("daily_usage_m3", 0)
        if daily_usage > 0:
            bill = await get_billing_estimate("Morocco", daily_usage)
            if bill:
                context["estimated_daily_bill"] = bill

        # Weather correlation
        correlation = await get_weather_correlation(meter_id)
        if correlation:
            context["weather_correlation"] = correlation

    # Alerts
    alerts = await get_alerts()
    if alerts:
        context["recent_alerts"] = [
            {"meter_id": a.get("meter_id"), "type": a.get("type"),
             "severity": a.get("severity"), "message": a.get("message"),
             "acknowledged": a.get("acknowledged")}
            for a in alerts[:10]
        ]

    return context
