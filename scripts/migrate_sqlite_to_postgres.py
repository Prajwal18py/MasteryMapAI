"""Copy local records to an EMPTY PostgreSQL database; never modifies the SQLite source."""
import argparse, getpass, os, sqlite3, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'backend'))
TABLES=['users','subjects','attempts','materials','chats','plans','runs','quizzes','reviews','assistance','course_imports']

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',default=str(root/'backend/data/student.db'))
    p.add_argument('--execute',action='store_true',help='Actually import into an empty target; otherwise show source row counts only.')
    args=p.parse_args()
    source=Path(args.source).resolve()
    if not source.is_file():raise SystemExit('SQLite source not found. Check --source.')
    c=sqlite3.connect(source.as_uri()+'?mode=ro',uri=True);c.row_factory=sqlite3.Row
    try:
        c.execute('BEGIN')
        counts={t:c.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0] for t in TABLES}
        for table,count in counts.items():print(f'{table}: {count} records')
        if not args.execute:
            print('Preview only. Stop the local app, back up the DB, then add --execute to import.');return
        if not os.getenv('DATABASE_URL'):
            os.environ['DATABASE_URL']=getpass.getpass('Paste the target PostgreSQL URL (hidden): ').strip()
        if not os.environ['DATABASE_URL'].startswith(('postgresql://','postgres://')):raise SystemExit('A PostgreSQL URL is required.')
        from app.database import db, init
        init()
        with db() as target:
            target.execute('BEGIN IMMEDIATE')
            # Prevent accidental merging of unrelated or already-imported records.
            for table in TABLES+['sessions','limits']:
                if target.execute(f'SELECT count(*) AS n FROM "{table}"').fetchone()['n']:
                    raise ValueError('Target database is not empty; nothing was imported. Use a new Neon branch/database.')
            for table in TABLES:
                cursor=c.execute(f'SELECT * FROM "{table}"')
                columns=[col[0] for col in cursor.description]
                col_sql=','.join('"'+col.replace('"','""')+'"' for col in columns)
                query=f'INSERT INTO "{table}" ({col_sql}) VALUES ({",".join("?" for _ in columns)})'
                while batch:=cursor.fetchmany(100):
                    for row in batch:
                        data=dict(row)
                        if table=='runs' and data.get('status')=='running':data['status']='interrupted'
                        target.execute(query,tuple(data[col] for col in columns))
                if target.execute(f'SELECT count(*) AS n FROM "{table}"').fetchone()['n']!=counts[table]:
                    raise ValueError('Row-count verification failed; import rolled back.')
            for table in ('chats','reviews'):
                target.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 1), EXISTS(SELECT 1 FROM {table}))")
        print('Import complete. Row counts verified. Sign in again: active sessions and rate-limit records were intentionally not copied.')
    finally:c.close()
if __name__=='__main__':
    try:main()
    except Exception as e:
        # Database driver errors may contain host/account details. Do not print URLs.
        message=str(e) if isinstance(e,ValueError) else type(e).__name__+': migration failed; check connection, permissions and source schema.'
        raise SystemExit(message)
