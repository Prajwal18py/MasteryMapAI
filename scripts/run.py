"""Start both services. Ctrl+C stops only the children started here."""

import os, shutil, socket, subprocess, sys, time
from pathlib import Path

root = Path(__file__).resolve().parents[1]
node = shutil.which("node")
next_cli = root / "frontend/node_modules/next/dist/bin/next"
if not node or not next_cli.exists():
    raise SystemExit("Run setup.ps1 first (or follow README manual setup).")
for port in (3000, 8000):
    with socket.socket() as s:
        if s.connect_ex(("127.0.0.1", port)) == 0:
            raise SystemExit(
                f"Port {port} is already in use. Stop that service before starting MasteryMap."
            )
processes = []
try:
    processes.append(
        subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
            ],
            cwd=root / "backend",
        )
    )
    processes.append(
        subprocess.Popen(
            [node, str(next_cli), "dev", "--hostname", "127.0.0.1", "--port", "3000"],
            cwd=root / "frontend",
            env={**os.environ, "NEXT_TELEMETRY_DISABLED": "1"},
        )
    )
    print(
        "\nMasteryMap: http://localhost:3000\nAPI docs: http://127.0.0.1:8000/docs\nPress Ctrl+C here to stop both services.\n",
        flush=True,
    )
    while all(p.poll() is None for p in processes):
        time.sleep(0.5)
except KeyboardInterrupt:
    print("\nStopping MasteryMap…")
finally:
    for p in processes:
        if p.poll() is None:
            p.terminate()
    for p in processes:
        try:
            p.wait(timeout=8)
        except subprocess.TimeoutExpired:
            p.kill()
