from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[1]
if not (root / "backend/.env").exists():
    shutil.copyfile(root / "backend/.env.example", root / "backend/.env")
print("Configuration ready. Add an API key to backend/.env for generative features.")
