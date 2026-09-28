"""Run the backend regression suite in a disposable PostgreSQL schema, then remove it."""
import getpass, os, subprocess, sys, uuid
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'backend'))
def main():
    import psycopg
    from psycopg import sql
    url=os.getenv('DATABASE_URL') or getpass.getpass('Paste the PostgreSQL URL (hidden): ').strip()
    schema='mm_test_'+uuid.uuid4().hex
    with psycopg.connect(url,autocommit=True,connect_timeout=15) as connection:
        connection.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(schema)))
        try:
            env={**os.environ,'DATABASE_URL':url,'MASTERYMAP_DB_SCHEMA':schema,'COOKIE_SECURE':'false','APP_ORIGINS':'http://testserver,http://localhost:3000,http://127.0.0.1:3000','PYTHONPATH':str(root/'backend')+os.pathsep+os.environ.get('PYTHONPATH','')}
            result=subprocess.run([sys.executable,'-m','unittest','discover','-s',str(root/'backend/tests'),'-v'],env=env,cwd=root)
        finally:
            connection.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(schema)))
    print('Disposable test schema removed. Application tables were not used.')
    return result.returncode
if __name__=='__main__':
    try:raise SystemExit(main())
    except Exception as e:raise SystemExit(type(e).__name__+': PostgreSQL verification failed. Check the URL and database permissions.')
