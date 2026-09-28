import sqlite3
from pathlib import Path
from datetime import datetime

root = Path(__file__).resolve().parents[1]
source = root / "backend/data/student.db"
if not source.exists():
    raise SystemExit("No student database yet.")
folder = root / "backups"
folder.mkdir(exist_ok=True)
target = folder / ("student-" + datetime.now().strftime("%Y%m%d-%H%M%S") + ".db")
with sqlite3.connect(source) as a, sqlite3.connect(target) as b:
    a.backup(b)
print(target)
