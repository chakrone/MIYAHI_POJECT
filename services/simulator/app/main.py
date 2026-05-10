"""
MIYAHI IoT Water Meter Simulator — Main Entry Point

Runs 5 virtual water meters, each publishing sensor readings to MQTT
at a configurable interval. Designed to run on a Raspberry Pi or in Docker.

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
    MQTT_QOS,
    MQTT_STATUS_TOPIC_TEMPLATE,
    MQTT_TOPIC_TEMPLATE,
    PUBLISH_INTERVAL_SEC,
)
from .meter_engine import MeterEngine

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

    # Create MQTT client
    client = mqtt.Client(client_id="miyahi-simulator", clean_session=True)
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_publish = on_publish

    # Connect with retry
    max_retries = 10
    for attempt in range(1, max_retries + 1):
        try:
            log(f"[CONN] Connecting to broker (attempt {attempt}/{max_retries})...")
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            break
        except (ConnectionRefusedError, OSError) as e:
            if attempt == max_retries:
                log(f"[ERROR] Could not connect after {max_retries} attempts: {e}")
                sys.exit(1)
            log("[WAIT] Broker not ready, retrying in 3s...")
            time.sleep(3)

    client.loop_start()

    # Give MQTT a moment to establish
    time.sleep(1)

    # Create meter engines
    engines = {
        meter_id: MeterEngine(meter_id, profile)
        for meter_id, profile in METER_PROFILES.items()
    }

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
