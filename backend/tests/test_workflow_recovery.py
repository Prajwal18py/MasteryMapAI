import os, tempfile, unittest, uuid, json, asyncio
from unittest.mock import patch, AsyncMock
os.environ.setdefault('MASTERYMAP_DATA', tempfile.mkdtemp())
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app.main import app
from app.providers import generate
import httpx

class RecoveryTests(unittest.TestCase):
 def setUp(self):
  self.client=TestClient(app);self.client.__enter__()
  self.client.post('/api/auth/register',json={'name':'Tester','email':uuid.uuid4().hex+'@example.test','password':'testing-password'})
  self.sid=self.client.get('/api/subjects').json()[0]['id'];self.path='/api/subjects/'+self.sid
 def tearDown(self):self.client.__exit__(None,None,None)
 def test_critic_failure_and_checkpoint_retry(self):
  planner=json.dumps({'concepts':['functions'],'rationale':'Practice the foundation.'})
  with patch('app.student_agents.generate',new=AsyncMock(side_effect=[planner,HTTPException(429,'Provider quota limit reached')])):
   rid=self.client.post(self.path+'/runs',json={'goal':'Review functions','minutes':30,'useAI':True}).json()['id']
  failed=next(r for r in self.client.get(self.path+'/runs').json() if r['id']==rid)
  self.assertEqual(failed['result']['failedStage'],'Critic')
  self.assertEqual(failed['events'][-1]['agent'],'Critic')
  self.assertEqual(self.client.post('/api/runs/'+rid+'/approve').status_code,409)
  critic=AsyncMock(return_value=json.dumps({'approved':True,'reason':'Appropriate','replacement':[]}))
  with patch('app.student_agents.generate',new=critic):
   retry=self.client.post('/api/runs/'+rid+'/retry',json={})
  self.assertEqual(retry.status_code,200,retry.text);self.assertEqual(critic.await_count,1)
  self.assertIn('Study Critic',critic.await_args.args[0])
  resumed=next(r for r in self.client.get(self.path+'/runs').json() if r['id']==retry.json()['id'])
  self.assertEqual(resumed['status'],'awaiting_approval');self.assertEqual(sum(t['minutes'] for t in resumed['result']['items']),30)
  self.assertEqual(self.client.get(self.path+'/plan').json(),None)
  self.assertEqual(self.client.post('/api/runs/'+resumed['id']+'/approve').status_code,200)
  with TestClient(app) as other:
   other.post('/api/auth/register',json={'name':'Other','email':uuid.uuid4().hex+'@example.test','password':'testing-password'})
   self.assertEqual(other.post('/api/runs/'+rid+'/retry').status_code,404)
 def test_rule_mode_never_calls_ai(self):
  with patch('app.student_agents.generate',new=AsyncMock()) as gen:
   self.client.post(self.path+'/runs',json={'goal':'Review','minutes':30,'useAI':False});gen.assert_not_called()

class ProviderLimitTests(unittest.IsolatedAsyncioTestCase):
 async def test_short_limit_retries_once(self):
  calls=[]
  def respond(request):
   calls.append(request)
   return httpx.Response(429,headers={'retry-after':'1'},json={'error':{'code':'rate_limit_exceeded'}}) if len(calls)==1 else httpx.Response(200,json={'choices':[{'message':{'content':'OK'}}]})
  client=httpx.AsyncClient(transport=httpx.MockTransport(respond))
  with patch.dict(os.environ,{'GROQ_API_KEY':'test'}),patch('app.providers.httpx.AsyncClient',return_value=client),patch('app.providers.asyncio.sleep',new=AsyncMock()) as sleep:
   self.assertEqual(await generate('system','prompt'),'OK');self.assertEqual(len(calls),2);sleep.assert_awaited_once_with(1)
 async def test_quota_does_not_retry(self):
  calls=[]
  def respond(request):
   calls.append(request);return httpx.Response(429,json={'error':{'code':'insufficient_quota'}})
  client=httpx.AsyncClient(transport=httpx.MockTransport(respond))
  with patch.dict(os.environ,{'GROQ_API_KEY':'test'}),patch('app.providers.httpx.AsyncClient',return_value=client):
   with self.assertRaises(HTTPException) as caught:await generate('system','prompt')
  self.assertEqual(caught.exception.status_code,429);self.assertEqual(len(calls),1)
