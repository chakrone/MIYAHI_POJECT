"""
MIYAHI IoT Water Meter Simulator — Individual Meter Controller

Start, stop, and manage individual meters independently from the
main simulator process.

Usage (from inside the container):
    docker exec -it miyahi-simulator python -m app.meter_ctl list
    docker exec -it miyahi-simulator python -m app.meter_ctl status
    docker exec -it miyahi-simulator python -m app.meter_ctl start meter_003
    docker exec -it miyahi-simulator python -m app.meter_ctl start meter_003 --background
    docker exec -it miyahi-simulator python -m app.meter_ctl start meter_003 --interval 2 --anomaly-rate 0.05
    docker exec -it miyahi-simulator python -m app.meter_ctl stop meter_003
    docker exec -it miyahi-simulator python -m app.meter_ctl stop-all
"""

import argparse
import os
import signal
import subprocess
import sys
from datetime import datetime

# ──────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────
PID_DIR = "/tmp/miyahi"


def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def ensure_pid_dir():
    os.makedirs(PID_DIR, exist_ok=True)


def pid_file_path(meter_id: str) -> str:
    return os.path.join(PID_DIR, f"{meter_id}.pid")


def is_process_running(pid: int) -> bool:
    """Check if a process with the given PID is running."""
    try:
        os.kill(pid, 0)  # Signal 0 = check existence
        return True
    except (ProcessLookupError, PermissionError):
        return False


def read_pid(meter_id: str) -> int | None:
    """Read PID from file. Returns None if file doesn't exist or PID is stale."""
    path = pid_file_path(meter_id)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r") as f:
            pid = int(f.read().strip())
        if is_process_running(pid):
            return pid
        else:
            # Stale PID file — clean up
            os.remove(path)
            return None
    except (ValueError, OSError):
        return None


def write_pid(meter_id: str, pid: int):
    ensure_pid_dir()
    with open(pid_file_path(meter_id), "w") as f:
        f.write(str(pid))


def remove_pid(meter_id: str):
    path = pid_file_path(meter_id)
    if os.path.exists(path):
        os.remove(path)


# ──────────────────────────────────────────────
# Commands
# ──────────────────────────────────────────────
def cmd_list():
    """List all available meter profiles."""
    from .config import METER_PROFILES

    print("\n  Available Meter Profiles")
    print("  " + "=" * 50)
    for meter_id, profile in METER_PROFILES.items():
        print(f"  {meter_id:<12}  {profile['label']:<18}  zone={profile['zone']}")
        print(f"  {'':12}  base_flow={profile['base_flow']} L/min, "
              f"volume={profile['starting_volume']} m³")
    print(f"\n  Total: {len(METER_PROFILES)} meters\n")


def cmd_status():
    """Show running status of all meters."""
    from .config import METER_PROFILES

    ensure_pid_dir()
    print("\n  Meter Status")
    print("  " + "=" * 60)
    print(f"  {'Meter ID':<12}  {'Label':<18}  {'Status':<12}  {'PID':<8}")
    print("  " + "-" * 60)

    for meter_id, profile in METER_PROFILES.items():
        pid = read_pid(meter_id)
        if pid is not None:
            status = "\033[92mRUNNING\033[0m"  # green
            pid_str = str(pid)
        else:
            status = "\033[90mSTOPPED\033[0m"  # grey
            pid_str = "—"
        print(f"  {meter_id:<12}  {profile['label']:<18}  {status:<22}  {pid_str}")

    print()


def cmd_start(meter_id: str, interval: float = None, anomaly_rate: float = None,
              background: bool = False):
    """Start a single meter."""
    from .config import METER_PROFILES

    if meter_id not in METER_PROFILES:
        log(f"[ERROR] Unknown meter '{meter_id}'. Use 'list' to see available meters.")
        sys.exit(1)

    # Check if already running
    existing_pid = read_pid(meter_id)
    if existing_pid is not None:
        log(f"[WARN] {meter_id} is already running (PID {existing_pid}). "
            f"Stop it first with: python -m app.meter_ctl stop {meter_id}")
        sys.exit(1)

    profile = METER_PROFILES[meter_id]
    log(f"[CTL] Starting {meter_id} ({profile['label']} — {profile['zone']})")

    if interval is not None:
        log(f"[CTL]   Interval override: {interval}s")
    if anomaly_rate is not None:
        log(f"[CTL]   Anomaly rate override: {anomaly_rate}")

    if background:
        # Fork a subprocess that runs run_single_meter
        cmd = [
            sys.executable, "-c",
            f"from app.main import run_single_meter; "
            f"run_single_meter('{meter_id}', "
            f"interval={interval}, anomaly_rate={anomaly_rate})"
        ]
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        write_pid(meter_id, proc.pid)
        log(f"[CTL] {meter_id} started in background (PID {proc.pid})")
        log(f"[CTL] Stop with: python -m app.meter_ctl stop {meter_id}")
    else:
        # Run in foreground — write PID for status checks
        write_pid(meter_id, os.getpid())
        try:
            from .main import run_single_meter
            run_single_meter(meter_id, interval=interval, anomaly_rate=anomaly_rate)
        finally:
            remove_pid(meter_id)


def cmd_stop(meter_id: str):
    """Stop a running meter."""
    pid = read_pid(meter_id)
    if pid is None:
        log(f"[CTL] {meter_id} is not running.")
        return

    log(f"[CTL] Stopping {meter_id} (PID {pid})...")
    try:
        os.kill(pid, signal.SIGTERM)
        # Wait briefly for clean shutdown
        import time
        for _ in range(10):
            if not is_process_running(pid):
                break
            time.sleep(0.5)

        if is_process_running(pid):
            log(f"[CTL] Process didn't stop gracefully, sending SIGKILL...")
            os.kill(pid, signal.SIGKILL)

        remove_pid(meter_id)
        log(f"[CTL] {meter_id} stopped.")
    except ProcessLookupError:
        remove_pid(meter_id)
        log(f"[CTL] {meter_id} was already stopped (stale PID file cleaned).")
    except Exception as e:
        log(f"[ERROR] Failed to stop {meter_id}: {e}")


def cmd_stop_all():
    """Stop all running meters."""
    from .config import METER_PROFILES

    stopped = 0
    for meter_id in METER_PROFILES:
        pid = read_pid(meter_id)
        if pid is not None:
            cmd_stop(meter_id)
            stopped += 1

    if stopped == 0:
        log("[CTL] No meters were running.")
    else:
        log(f"[CTL] Stopped {stopped} meter(s).")


# ──────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        prog="meter_ctl",
        description="MIYAHI — Control individual water meters independently",
    )
    sub = parser.add_subparsers(dest="command", help="Available commands")

    # list
    sub.add_parser("list", help="List available meter profiles")

    # status
    sub.add_parser("status", help="Show running/stopped status of all meters")

    # start
    start_p = sub.add_parser("start", help="Start a single meter")
    start_p.add_argument("meter_id", help="Meter ID to start (e.g. meter_003)")
    start_p.add_argument("--interval", type=float, default=None,
                         help="Override publish interval in seconds")
    start_p.add_argument("--anomaly-rate", type=float, default=None,
                         help="Override anomaly probability (0.0–1.0)")
    start_p.add_argument("--background", action="store_true",
                         help="Run meter in background (detached)")

    # stop
    stop_p = sub.add_parser("stop", help="Stop a running meter")
    stop_p.add_argument("meter_id", help="Meter ID to stop")

    # stop-all
    sub.add_parser("stop-all", help="Stop all running meters")

    args = parser.parse_args()

    if args.command == "list":
        cmd_list()
    elif args.command == "status":
        cmd_status()
    elif args.command == "start":
        cmd_start(args.meter_id, interval=args.interval,
                  anomaly_rate=args.anomaly_rate, background=args.background)
    elif args.command == "stop":
        cmd_stop(args.meter_id)
    elif args.command == "stop-all":
        cmd_stop_all()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
