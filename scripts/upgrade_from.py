"""Copy an existing account database into this fresh source folder; never alter the original."""
import argparse,sqlite3,shutil
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('previous_root',type=Path);p.add_argument('--database',type=Path);args=p.parse_args()
root=Path(__file__).resolve().parents[1];old=args.previous_root.resolve()
if old==root:raise SystemExit('Extract the new source beside the old folder before using this helper.')
source=args.database or old/'backend/data/student.db';target=root/'backend/data/student.db'
if not source.is_file():raise SystemExit('No previous database found. Use --database for a custom data location.')
if target.exists():raise SystemExit('The destination already has a database. Nothing was overwritten.')
target.parent.mkdir(parents=True,exist_ok=True)
with sqlite3.connect(source.resolve().as_uri()+'?mode=ro',uri=True) as src,sqlite3.connect(target) as dst:src.backup(dst)
config=old/'backend/.env'
if config.is_file():shutil.copyfile(config,root/'backend/.env')
print('Copied learning data and existing configuration. Original files were not changed.')
print('If the copied .env sets MASTERYMAP_DATA, update it to this folder before starting.')
