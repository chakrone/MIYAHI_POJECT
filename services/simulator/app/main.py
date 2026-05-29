"""
MIYAHI IoT Water Meter Simulator — Main Entry Point

Runs 5 virtual water meters, each publishing sensor readings to MQTT
at a configurable interval. On startup the simulator fetches the last
known volume for each meter from TimescaleDB so simulation resumes
from where it left off rather than from the hardcoded baseline.

Usage:
    python -m app.main
    # or
    docker-compose --profile simulator up
"""

import json
import os
import signal
import sys
import threading
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

from .config import (
    METER_PROFILES,
    MQTT_HOST,
    MQTT_PORT,
    MQTT_USERNAME,
    MQTT_PASSWORD,
    MQTT_QOS,
    MQTT_STATUS_TOPIC_TEMPLATE,
    MQTT_TOPIC_TEMPLATE,
    PUBLISH_INTERVAL_SEC,
)
from .meter_engine import MeterEngine


# ──────────────────────────────────────────────
# DB resume: fetch last known volume per meter
# ──────────────────────────────────────────────
def fetch_last_volumes() -> dict:
    """Query TimescaleDB for the latest recorded volume per meter.
    Returns a dict {meter_id: volume_m3}. Falls back to empty dict on error."""
    ts_url = os.getenv(
        "TIMESCALE_URL",
        "postgresql+psycopg://miyahi:miyahi_ts_dev_2026@timescaledb:5432/miyahi_ts",
    )
    # Convert SQLAlchemy-style URL to psycopg3 conninfo
    conninfo = ts_url.replace("postgresql+psycopg://", "postgresql://")
    try:
        import psycopg  # psycopg3
        with psycopg.connect(conninfo, connect_timeout=5) as conn:
            rows = conn.execute(
                """
                SELECT DISTINCT ON (meter_id) meter_id, volume
                FROM meter_readings
                ORDER BY meter_id, time DESC
                """
            ).fetchall()
        result = {row[0]: row[1] for row in rows}
        log(f"[DB] Resumed volumes for {len(result)} meters from TimescaleDB")
        return result
    except Exception as e:
        log(f"[DB] Could not fetch last volumes ({e}), using config baselines")
        return {}

# Fix Windows console encoding for Unicode output
if os.name == "nt":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


# ──────────────────────────────────────────────
# Logging helpers (ASCII-safe icons for Windows)
# ──────────────────────────────────────────────
def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def log_reading(meter_id: str, reading: dict):
    status_icon = "[OK]" if reading["status"] == "ok" else "[!!]"
    print(
        f"  {status_icon} [{meter_id}] "
        f"flow={reading['flow_rate_lpm']:6.2f} L/min | "
        f"prs={reading['pressure_bar']:.2f} bar | "
        f"vol={reading['volume_m3']:.4f} m3 | "
        f"tmp={reading['temperature_c']:.1f} C | "
        f"status={reading['status']}",
        flush=True,
    )


# ──────────────────────────────────────────────
# MQTT callbacks
# ──────────────────────────────────────────────
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        log("[MQTT] Connected to broker")
    else:
        log(f"[MQTT] Connection failed with code {rc}")


def on_disconnect(client, userdata, rc):
    if rc != 0:
        log(f"[MQTT] Unexpected disconnect (rc={rc}), will auto-reconnect")


def on_publish(client, userdata, mid):
    pass  # Silently confirm publish


# ──────────────────────────────────────────────
# Reusable MQTT client factory
# ──────────────────────────────────────────────
def create_mqtt_client(client_id: str = "miyahi-simulator") -> mqtt.Client:
    """Create, configure, and connect an MQTT client with retry logic."""
    client = mqtt.Client(client_id=client_id, clean_session=True)
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_publish = on_publish

    max_retries = 10
    for attempt in range(1, max_retries + 1):
        try:
            log(f"[CONN] Connecting to broker (attempt {attempt}/{max_retries})...")
            if MQTT_USERNAME and MQTT_PASSWORD:
                client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            break
        except (ConnectionRefusedError, OSError) as e:
            if attempt == max_retries:
                log(f"[ERROR] Could not connect after {max_retries} attempts: {e}")
                sys.exit(1)
            log("[WAIT] Broker not ready, retrying in 3s...")
            time.sleep(3)

    client.loop_start()
    time.sleep(1)  # Give MQTT a moment to establish
    return client


# ──────────────────────────────────────────────
# Meter runner (one per thread)
# ──────────────────────────────────────────────
def run_meter(client: mqtt.Client, engine: MeterEngine, stop_event: threading.Event):
    """Continuously generate and publish readings for one meter."""
    meter_id = engine.meter_id
    data_topic = MQTT_TOPIC_TEMPLATE.format(meter_id=meter_id)
    status_topic = MQTT_STATUS_TOPIC_TEMPLATE.format(meter_id=meter_id)

    # Publish online status
    client.publish(
        status_topic,
        json.dumps({"meter_id": meter_id, "status": "online", "timestamp": datetime.now(timezone.utc).isoformat()}),
        qos=MQTT_QOS,
        retain=True,
    )

    while not stop_event.is_set():
        reading = engine.generate_reading()
        payload = json.dumps(reading)
        result = client.publish(data_topic, payload, qos=MQTT_QOS)

        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            log_reading(meter_id, reading)
        else:
            log(f"[ERROR] Failed to publish for {meter_id}: rc={result.rc}")

        stop_event.wait(timeout=PUBLISH_INTERVAL_SEC)

    # Publish offline status on shutdown
    client.publish(
        status_topic,
        json.dumps({"meter_id": meter_id, "status": "offline", "timestamp": datetime.now(timezone.utc).isoformat()}),
        qos=MQTT_QOS,
        retain=True,
    )
    log(f"[STOP] Meter {meter_id} stopped")


def run_single_meter(meter_id: str, interval: float = None, anomaly_rate: float = None):
    """Start a single meter in the foreground. Used by meter_ctl.py."""
    from .config import ANOMALY_PROBABILITY as default_anomaly

    if meter_id not in METER_PROFILES:
        log(f"[ERROR] Unknown meter '{meter_id}'. Available: {list(METER_PROFILES.keys())}")
        sys.exit(1)

    profile = dict(METER_PROFILES[meter_id])

    # Override interval if provided
    if interval is not None:
        import app.config as cfg
        cfg.PUBLISH_INTERVAL_SEC = interval

    # Override anomaly rate if provided
    if anomaly_rate is not None:
        import app.config as cfg
        cfg.ANOMALY_PROBABILITY = anomaly_rate

    # Resume volume from DB if possible
    last_volumes = fetch_last_volumes()
    if meter_id in last_volumes:
        profile["starting_volume"] = last_volumes[meter_id]
        log(f"[RESUME] {meter_id} volume={last_volumes[meter_id]:.4f} m³ (from DB)")
    else:
        log(f"[INIT]   {meter_id} volume={profile['starting_volume']:.4f} m³ (baseline)")

    engine = MeterEngine(meter_id, profile)
    client = create_mqtt_client(client_id=f"miyahi-ctl-{meter_id}")

    stop_event = threading.Event()

    def shutdown_handler(signum, frame):
        log(f"\n[STOP] Shutdown signal for {meter_id}")
        stop_event.set()

    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    log(f"[START] {meter_id} ({profile['label']} - {profile['zone']})")
    run_meter(client, engine, stop_event)

    client.loop_stop()
    client.disconnect()
    log(f"[DONE] {meter_id} stopped cleanly.")


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
def main():
    log("=" * 60)
    log("MIYAHI IoT Water Meter Simulator")
    log(f"   Broker: {MQTT_HOST}:{MQTT_PORT}")
    log(f"   Meters: {len(METER_PROFILES)}")
    log(f"   Interval: {PUBLISH_INTERVAL_SEC}s")
    log("=" * 60)

    # Create MQTT client (uses shared factory with retry)
    client = create_mqtt_client(client_id="miyahi-simulator")

    # Load last volumes from DB — if available use them, else fall back to profile defaults
    last_volumes = fetch_last_volumes()

    # Create meter engines
    engines = {}
    for meter_id, profile in METER_PROFILES.items():
        if meter_id in last_volumes:
            # Resume from last known DB value
            override = dict(profile)
            override["starting_volume"] = last_volumes[meter_id]
            engines[meter_id] = MeterEngine(meter_id, override)
            log(f"[RESUME] {meter_id} volume={last_volumes[meter_id]:.4f} m³ (from DB)")
        else:
            engines[meter_id] = MeterEngine(meter_id, profile)
            log(f"[INIT]   {meter_id} volume={profile['starting_volume']:.4f} m³ (baseline)")

    # Stop event for graceful shutdown
    stop_event = threading.Event()

    def shutdown_handler(signum, frame):
        log("\n[STOP] Shutdown signal received, stopping all meters...")
        stop_event.set()

    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    # Start one thread per meter
    threads = []
    for meter_id, engine in engines.items():
        log(f"[START] {meter_id} ({engine.profile['label']} - {engine.profile['zone']})")
        t = threading.Thread(
            target=run_meter,
            args=(client, engine, stop_event),
            name=f"meter-{meter_id}",
            daemon=True,
        )
        t.start()
        threads.append(t)
        # Stagger starts slightly so output doesn't all arrive simultaneously
        time.sleep(0.3)

    log(f"\n[READY] All {len(threads)} meters running. Press Ctrl+C to stop.\n")

    # Wait for shutdown
    try:
        while not stop_event.is_set():
            stop_event.wait(timeout=1.0)
    except KeyboardInterrupt:
        stop_event.set()

    # Wait for threads to finish
    for t in threads:
        t.join(timeout=5)

    client.loop_stop()
    client.disconnect()
    log("[DONE] Simulator shut down cleanly.")


if __name__ == "__main__":
    main()
