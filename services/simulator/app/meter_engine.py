"""
MIYAHI IoT Water Meter Simulator — Meter Engine

Generates realistic synthetic sensor readings per meter based on its profile.
Each meter produces:
  - flow_rate_lpm: sinusoidal daily cycle + Gaussian noise + optional anomaly spikes
  - pressure_bar: Gaussian around a mean
  - volume_m3: monotonically increasing counter (integrates flow over time)
  - temperature_c: slow diurnal drift
  - status: 'ok' | 'leak_suspected' | 'low_pressure'
"""

import math
import random
from datetime import datetime, timezone

from .config import ANOMALY_PROBABILITY, PUBLISH_INTERVAL_SEC


class MeterEngine:
    """Generates synthetic readings for a single virtual water meter."""

    def __init__(self, meter_id: str, profile: dict):
        self.meter_id = meter_id
        self.profile = profile
        self.volume = profile["starting_volume"]
        self._tick_count = 0

        # Add a small random phase offset so meters don't all peak at exactly the same time
        self._phase_offset = random.uniform(-0.5, 0.5)

    def generate_reading(self) -> dict:
        """Produce one sensor reading for this meter."""
        now = datetime.now(timezone.utc)
        hour = now.hour + now.minute / 60.0

        # ── Flow rate ────────────────────────────────────
        # Dual-peak sinusoidal: morning peak and evening peak
        morning_peak, evening_peak = self.profile["peak_hours"]
        morning_component = math.exp(-0.5 * ((hour - morning_peak + self._phase_offset) / 2.0) ** 2)
        evening_component = math.exp(-0.5 * ((hour - evening_peak + self._phase_offset) / 2.0) ** 2)

        flow_rate = (
            self.profile["base_flow"]
            + self.profile["peak_amplitude"] * (morning_component + evening_component)
            + random.gauss(0, self.profile["noise_std"])
        )
        flow_rate = max(0.0, flow_rate)

        # ── Status & anomaly injection ───────────────────
        status = "ok"
        if random.random() < ANOMALY_PROBABILITY:
            anomaly_type = random.choices(
                ["leak_suspected", "low_pressure"],
                weights=[0.6, 0.4],
                k=1
            )[0]
            status = anomaly_type

            if anomaly_type == "leak_suspected":
                # Leak: sustained high flow even during off-hours
                flow_rate += random.uniform(15.0, 35.0)
            elif anomaly_type == "low_pressure":
                # Pressure will be handled below, but also reduce flow
                flow_rate *= random.uniform(0.3, 0.6)

        # ── Volume accumulation ──────────────────────────
        # flow_rate is L/min; interval is in seconds
        volume_delta = flow_rate * (PUBLISH_INTERVAL_SEC / 60.0) / 1000.0  # convert L to m³
        self.volume += volume_delta

        # ── Pressure ─────────────────────────────────────
        pressure = random.gauss(
            self.profile["pressure_mean"],
            self.profile["pressure_std"]
        )
        if status == "low_pressure":
            pressure *= random.uniform(0.3, 0.5)
        pressure = max(0.0, pressure)

        # ── Temperature ──────────────────────────────────
        # Diurnal cycle: warmest around 14:00, coolest around 02:00
        temperature = (
            self.profile["temp_base"]
            + self.profile["temp_amplitude"] * math.sin((hour - 14.0) * math.pi / 12.0)
            + random.gauss(0, 0.5)
        )

        self._tick_count += 1

        return {
            "meter_id": self.meter_id,
            "timestamp": now.isoformat(),
            "flow_rate_lpm": round(flow_rate, 2),
            "pressure_bar": round(pressure, 2),
            "volume_m3": round(self.volume, 4),
            "temperature_c": round(temperature, 1),
            "status": status,
        }
