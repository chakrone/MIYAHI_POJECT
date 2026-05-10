"""
MIYAHI IoT Water Meter Simulator — Configuration

Defines meter profiles, simulation parameters, and MQTT settings.
Each meter has a unique usage profile to generate realistic, diverse data.
"""

import os

# ──────────────────────────────────────────────
# MQTT Configuration
# ──────────────────────────────────────────────
MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_QOS = 1
MQTT_TOPIC_TEMPLATE = "meters/{meter_id}/data"
MQTT_STATUS_TOPIC_TEMPLATE = "meters/{meter_id}/status"

# ──────────────────────────────────────────────
# Simulation Parameters
# ──────────────────────────────────────────────
PUBLISH_INTERVAL_SEC = int(os.getenv("PUBLISH_INTERVAL", "5"))  # seconds between readings
ANOMALY_PROBABILITY = float(os.getenv("ANOMALY_PROBABILITY", "0.02"))  # 2% chance per tick

# ──────────────────────────────────────────────
# Meter Profiles
# ──────────────────────────────────────────────
# Each profile defines realistic usage patterns for a specific zone.
# - base_flow: average flow rate in L/min during active hours
# - noise_std: standard deviation of Gaussian noise on flow
# - peak_hours: tuple of (morning_peak, evening_peak) hours
# - peak_amplitude: how much flow increases during peak
# - pressure_mean / pressure_std: water pressure in bar
# - temp_base / temp_amplitude: water temperature in °C
# - starting_volume: initial cumulative volume in m³

METER_PROFILES = {
    "meter_001": {
        "label": "Main Meter",
        "zone": "General",
        "base_flow": 10.0,
        "noise_std": 2.0,
        "peak_hours": (8, 19),
        "peak_amplitude": 8.0,
        "pressure_mean": 3.0,
        "pressure_std": 0.3,
        "temp_base": 18.0,
        "temp_amplitude": 4.0,
        "starting_volume": 1045.0,
    },
    "meter_002": {
        "label": "Kitchen Meter",
        "zone": "Kitchen",
        "base_flow": 5.0,
        "noise_std": 1.5,
        "peak_hours": (7, 12),    # meal prep times
        "peak_amplitude": 6.0,
        "pressure_mean": 2.8,
        "pressure_std": 0.2,
        "temp_base": 20.0,
        "temp_amplitude": 3.0,
        "starting_volume": 520.0,
    },
    "meter_003": {
        "label": "Garden Meter",
        "zone": "Garden",
        "base_flow": 2.0,          # low baseline
        "noise_std": 1.0,
        "peak_hours": (6, 18),     # early morning and late afternoon watering
        "peak_amplitude": 15.0,    # irrigation bursts
        "pressure_mean": 2.5,
        "pressure_std": 0.4,
        "temp_base": 22.0,
        "temp_amplitude": 6.0,
        "starting_volume": 890.0,
    },
    "meter_004": {
        "label": "Bathroom Meter",
        "zone": "Bathroom",
        "base_flow": 3.0,
        "noise_std": 2.5,
        "peak_hours": (7, 22),     # morning shower, evening bath
        "peak_amplitude": 10.0,
        "pressure_mean": 3.2,
        "pressure_std": 0.25,
        "temp_base": 25.0,         # warm water
        "temp_amplitude": 5.0,
        "starting_volume": 760.0,
    },
    "meter_005": {
        "label": "Pool Meter",
        "zone": "Pool",
        "base_flow": 0.5,          # very low — pool recirculation
        "noise_std": 0.3,
        "peak_hours": (10, 16),    # midday filling/top-up
        "peak_amplitude": 8.0,
        "pressure_mean": 2.0,
        "pressure_std": 0.15,
        "temp_base": 26.0,
        "temp_amplitude": 3.0,
        "starting_volume": 320.0,
    },
}
