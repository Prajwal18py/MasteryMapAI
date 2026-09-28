"""SQLite locally, PostgreSQL when DATABASE_URL is configured.

Only application-owned parameterised SQL is accepted here. Database URLs are never logged.
"""
import os, re, sqlite3
from pathlib import Path
from contextlib import contextmanager

DATA = Path(os.getenv("MASTERYMAP_DATA", str(Path(__file__).resolve().parents[1] / "data")))

# Application queries use SQLite-style placeholders. Preserve quoted SQL literals.
def postgres_sql(query):
    parts = re.split(r"('(?:''|[^'])*'|\"(?:\"\"|[^\"])*\")", query)
    return ''.join(part if i % 2 else part.replace('?', '%s') for i, part in enumerate(parts))

class PostgresConnection:
    dialect = "postgresql"
    def __init__(self, connection):
        self.connection = connection
    def execute(self, query, args=()):
        if query.strip().upper() == "BEGIN IMMEDIATE":
            # Match the serialisation of the app's SQLite critical write sections.
            return self.connection.execute("SELECT pg_advisory_xact_lock(59421873)")
        return self.connection.execute(postgres_sql(query), args or None)
    def executescript(self, script):
        for statement in script.split(';'):
            if statement.strip():
                self.execute(statement)

@contextmanager
def db():
    url = os.getenv("DATABASE_URL", "").strip()
    if os.getenv("RENDER") and not url:
        raise RuntimeError("Set DATABASE_URL on Render. Refusing to store deployed records in temporary SQLite storage.")
    if url:
        if not url.startswith(("postgres://", "postgresql://")):
            raise RuntimeError("DATABASE_URL must be a PostgreSQL connection URL, or empty for local SQLite.")
        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError:
            raise RuntimeError("Install backend/requirements-postgres.txt to use PostgreSQL.") from None
        # Disabling prepared statements also supports pooled connections.
        connection = psycopg.connect(url, row_factory=dict_row, connect_timeout=15, prepare_threshold=None)
        try:
            connection.execute("SET LOCAL statement_timeout = '30s'")
            schema = os.getenv("MASTERYMAP_DB_SCHEMA", "public")
            if not re.fullmatch(r"[a-z][a-z0-9_]{0,62}", schema):
                raise RuntimeError("Invalid MASTERYMAP_DB_SCHEMA")
            connection.execute('SET LOCAL search_path TO "' + schema + '"')
        except Exception:
            connection.close()
            raise
        wrapped = PostgresConnection(connection)
    else:
        DATA.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(DATA / "student.db", timeout=20)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys=ON")
        wrapped = connection
    try:
        yield wrapped
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

def rows(c, q, args=()):
    return [dict(x) for x in c.execute(q, args)]

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,name TEXT,password TEXT);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires INTEGER);
CREATE TABLE IF NOT EXISTS subjects(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),name TEXT,description TEXT,concepts TEXT,questions TEXT,preferences TEXT,created_at TEXT);
CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),subject_id TEXT REFERENCES subjects(id),question_id TEXT,concept TEXT,correct INTEGER,hint INTEGER,seconds INTEGER,created_at TEXT);
CREATE TABLE IF NOT EXISTS materials(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),subject_id TEXT REFERENCES subjects(id),name TEXT,content TEXT,metadata TEXT,created_at TEXT);
CREATE TABLE IF NOT EXISTS chats(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT,subject_id TEXT,role TEXT,content TEXT,created_at TEXT);
CREATE TABLE IF NOT EXISTS plans(subject_id TEXT PRIMARY KEY,user_id TEXT,content TEXT);
CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,user_id TEXT,subject_id TEXT,status TEXT,input TEXT,result TEXT,events TEXT,created_at TEXT);
CREATE TABLE IF NOT EXISTS quizzes(id TEXT PRIMARY KEY,user_id TEXT,subject_id TEXT,title TEXT,questions TEXT,duration INTEGER,started_at TEXT,submitted_at TEXT,answers TEXT,result TEXT,created_at TEXT);
CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER,until INTEGER);
CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT,subject_id TEXT,concept TEXT,kind TEXT,content TEXT,created_at TEXT);
CREATE TABLE IF NOT EXISTS assistance(user_id TEXT,subject_id TEXT,concept TEXT,at TEXT,PRIMARY KEY(user_id,subject_id,concept));
CREATE TABLE IF NOT EXISTS course_imports(id TEXT PRIMARY KEY,user_id TEXT,content TEXT,created_at TEXT);
CREATE INDEX IF NOT EXISTS history ON attempts(user_id,subject_id,created_at);
"""

def init():
    with db() as c:
        if isinstance(c, PostgresConnection):
            c.execute("BEGIN IMMEDIATE")
            c.executescript(SCHEMA.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "BIGSERIAL PRIMARY KEY"))
        else:
            c.executescript(SCHEMA)
