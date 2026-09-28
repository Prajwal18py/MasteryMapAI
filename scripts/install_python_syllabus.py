"""Install five Python syllabus subjects without replacing existing learning data."""
import argparse
import json
import os
from pathlib import Path
import re
import sqlite3
import uuid
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'backend' / 'curriculum' / 'python-syllabus.json'
NAMESPACE = uuid.UUID('f8a042af-ddc8-4d35-b625-47e8310fcd55')


def validate(pack):
    keys = set()
    for m in pack['modules']:
        assert m['key'] not in keys, 'Duplicate module key'
        keys.add(m['key'])
        concepts = {c['id']: c for c in m['concepts']}
        assert 1 <= len(concepts) <= 30 and len(concepts) == len(m['concepts'])
        assert 2 <= len(m['name']) <= 100
        visited = set()
        def visit(cid, path):
            assert cid in concepts, f'Unknown prerequisite: {cid}'
            assert cid not in path, f'Cycle at {cid}'
            if cid in visited:
                return
            c = concepts[cid]
            assert re.fullmatch(r'[a-z0-9_-]{1,40}', cid)
            assert 2 <= len(c['name']) <= 80 and len(c['summary']) <= 2000
            for dep in c['prereqs']:
                visit(dep, path | {cid})
            visited.add(cid)
        for cid in concepts:
            visit(cid, set())
        ids = set()
        covered = set()
        assert len(m['questions']) <= 300
        for q in m['questions']:
            assert q['id'] not in ids
            ids.add(q['id'])
            assert q['concept'] in concepts
            covered.add(q['concept'])
            assert len(q['options']) == len(set(q['options'])) == 4
            assert all(isinstance(x, str) and x.strip() for x in q['options'])
            assert 0 <= q['correct'] <= 3 and 1 <= q['difficulty'] <= 3
            assert 8 <= len(q['prompt']) <= 3000 and 5 <= len(q['explanation']) <= 2500
        assert covered == set(concepts), 'Every topic needs practice coverage'
    assert len(keys) == 5


def install(database, pack, email=None):
    validate(pack)
    database = Path(database).resolve()
    if not database.is_file():
        raise ValueError(f'Database does not exist: {database}. Start the app and create an account first.')
    with sqlite3.connect(database) as c:
        c.execute('PRAGMA foreign_keys=ON')
        users = c.execute('SELECT id FROM users' + (' WHERE lower(email)=lower(?)' if email else ''), (email,) if email else ()).fetchall()
        if not users:
            raise ValueError('No matching account. Create an account first, then rerun this installer.')
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        backup = database.with_name(f'student-before-syllabus-{stamp}.db')
        with sqlite3.connect(backup) as target:
            c.backup(target)
        inserted = 0
        # Add-only: reruns never overwrite user edits or reset module progress.
        with c:
            for (user_id,) in users:
                for m in pack['modules']:
                    sid = uuid.uuid5(NAMESPACE, f'{user_id}:python-syllabus-v1:{m["key"]}').hex
                    if c.execute('SELECT 1 FROM subjects WHERE id=?', (sid,)).fetchone():
                        continue
                    c.execute('INSERT INTO subjects (id,user_id,name,description,concepts,questions,preferences,created_at) VALUES (?,?,?,?,?,?,?,?)', (
                        sid, user_id, m['name'], m['description'], json.dumps(m['concepts']), json.dumps(m['questions']),
                        json.dumps({'dailyMinutes':45,'examDate':'','totalMarks':100,'weights':{}}), datetime.now(timezone.utc).isoformat()))
                    inserted += 1
    return inserted, backup


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path, help='Explicit path to student.db')
    parser.add_argument('--email', help='Install only for this existing account; defaults to all existing accounts')
    parser.add_argument('--validate-only', action='store_true')
    args = parser.parse_args()
    pack = json.loads(PACK.read_text(encoding='utf-8'))
    validate(pack)
    if args.validate_only:
        print('Valid: 5 modules, 45 concept entries, 91 practice questions.')
        return
    # Match the app environment without overwriting process environment variables.
    try:
        from dotenv import load_dotenv
        load_dotenv(ROOT / 'backend' / '.env')
    except ImportError:
        if (ROOT / 'backend' / '.env').exists() and not args.database:
            raise ValueError('Use the project virtual environment, or supply --database explicitly.')
    folder = Path(os.environ.get('MASTERYMAP_DATA', str(ROOT / 'backend' / 'data')))
    if not args.database and not folder.is_absolute():
        raise ValueError('For relative MASTERYMAP_DATA, pass --database with the absolute database path.')
    count, backup = install(args.database or folder / 'student.db', pack, args.email)
    print(f'Added {count} subjects. Existing subjects and progress preserved.')
    print(f'Backup: {backup}')
    print('Restart the app, refresh, and select Python I through Python V in the subject selector.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, AssertionError, sqlite3.Error, OSError) as exc:
        raise SystemExit(f'Syllabus installation failed: {exc}')
