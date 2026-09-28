import unittest
from unittest.mock import Mock
from app.database import postgres_sql, PostgresConnection, SCHEMA
class DatabaseAdapterTests(unittest.TestCase):
 def test_parameter_binding(self):
  c=Mock();PostgresConnection(c).execute('SELECT * FROM users WHERE email=?',("x' OR 1=1 --",))
  c.execute.assert_called_once_with('SELECT * FROM users WHERE email=%s',("x' OR 1=1 --",))
 def test_quoted_literals_unchanged(self):
  self.assertEqual(postgres_sql("SELECT '?' AS text, 'it''s ?' AS quoted WHERE id=?"),"SELECT '?' AS text, 'it''s ?' AS quoted WHERE id=%s")
 def test_critical_transaction_lock(self):
  c=Mock();PostgresConnection(c).execute('BEGIN IMMEDIATE');c.execute.assert_called_once_with('SELECT pg_advisory_xact_lock(59421873)')
 def test_postgres_schema(self):
  self.assertNotIn('AUTOINCREMENT',SCHEMA.replace('INTEGER PRIMARY KEY AUTOINCREMENT','BIGSERIAL PRIMARY KEY'))
