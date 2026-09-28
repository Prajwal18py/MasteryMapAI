import unittest,json,asyncio
from unittest.mock import AsyncMock
from app.feedback import grounded_reply,numbered_sources
from app.retrieval import check_citations,chunks
class FeedbackTests(unittest.TestCase):
 def setUp(self):self.sources=[{'source':'Closures notes','text':'A closure retains enclosing variables.'}]
 def test_numbering(self):self.assertTrue(numbered_sources(self.sources).startswith('[1] Closures notes'))
 def test_code_indexes_not_citations(self):
  self.assertTrue(check_citations('Closure [1].\n```python\nx = values[9]\n```',self.sources));self.assertFalse(check_citations('Use `values[1]`.',self.sources));self.assertFalse(check_citations('Claim [7].',self.sources))
 def test_grouped_citations(self):self.assertTrue(check_citations('Claim [1, 2].',self.sources*2))
 def test_repair_once(self):
  gen=AsyncMock(side_effect=['No references','A closure retains variables [1].']);r=asyncio.run(grounded_reply(gen,'Tutor',{},self.sources));self.assertEqual(r[2],'generated');self.assertEqual(gen.await_count,2)
 def test_failed_repair_stays_reference(self):
  gen=AsyncMock(side_effect=['Claim [8]','Claim [9]']);r=asyncio.run(grounded_reply(gen,'Tutor',{},self.sources));self.assertEqual(r[2],'reference');self.assertNotIn('Claim [9]',r[0])
 def test_no_sources_no_provider(self):
  gen=AsyncMock();r=asyncio.run(grounded_reply(gen,'Tutor',{},[]));gen.assert_not_awaited();self.assertEqual(r[2],'reference')
 def test_page_boundaries(self):
  rows=chunks([{'id':'a','name':'notes.pdf','content':'[Page 1]\nFirst page text.\n[Page 2]\nSecond page text.'}]);self.assertEqual([r['page'] for r in rows],[1,2]);self.assertNotIn('Second',rows[0]['text'])
