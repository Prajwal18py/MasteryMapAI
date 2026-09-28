import os,tempfile,unittest,uuid,json
from datetime import datetime,timezone,timedelta
from unittest.mock import patch,AsyncMock
os.environ.setdefault('MASTERYMAP_DATA',tempfile.mkdtemp())
from fastapi.testclient import TestClient
from app.main import app,Subject
from app.curriculum import combined
from app.evaluation import evaluate
class UpgradeTests(unittest.TestCase):
 def setUp(self):
  self.c=TestClient(app);self.c.__enter__()
  r=self.c.post('/api/auth/register',json={'name':'Learner','email':uuid.uuid4().hex+'@example.test','password':'testing-password'})
  self.assertEqual(r.status_code,200,r.text)
  self.sid=self.c.get('/api/subjects').json()[0]['id'];self.b='/api/subjects/'+self.sid;self.s=self.c.get(self.b).json()['subject']
 def tearDown(self):self.c.__exit__(None,None,None)
 def answer(self,q,correct=False,hint=False):
  return self.c.post(self.b+'/answer',json={'questionId':q['id'],'choice':q['correct'] if correct else (q['correct']+1)%4,'hint':hint,'attemptId':uuid.uuid4().hex})
 def test_seed(self):
  Subject.model_validate(combined());self.assertEqual(len(self.s['concepts']),43);self.assertGreater(len(self.s['questions']),100)
  self.assertEqual(len(self.c.get(self.b+'/learning-hub').json()['modules']),5)
 def test_mistakes_and_revision(self):
  q=self.s['questions'][0];self.answer(q)
  self.assertFalse(self.c.get(self.b+'/learning-hub').json()['mistakes'][0]['resolved'])
  self.answer(q,True,True);self.assertFalse(self.c.get(self.b+'/learning-hub').json()['mistakes'][0]['resolved'])
  for _ in range(3):self.answer(q,True)
  d=self.c.get(self.b+'/learning-hub').json();self.assertTrue(d['mistakes'][0]['resolved']);r=next(x for x in d['queue'] if x['id']==q['concept']);self.assertEqual(r['intervalDays'],4);self.assertFalse(r['overdue'])
 def test_followup_and_filter(self):
  r=self.c.get(self.b+'/next-step/decorators?exclude=py-13');self.assertEqual(r.status_code,200,r.text)
  self.assertIn(r.json()['target']['id'],['hof','closures']);self.assertNotIn('correct',r.json()['question'])
  r=self.c.post(self.b+'/practice',json={'kind':'debugging','module':'Object-Oriented Programming'});self.assertEqual(r.status_code,200,r.text);qid=r.json()['id']
  self.assertEqual(next(q for q in self.s['questions'] if q['id']==qid)['kind'],'debugging')
  r=self.c.post(self.b+'/practice',json={'kind':'debugging','exclude':[qid]});self.assertNotEqual(r.json()['id'],qid)
 def test_weighted_exam(self):
  r=self.c.post(self.b+'/quizzes',json={'title':'Exam test','count':6,'duration':5,'moduleWeights':{'Application Development':1}});self.assertEqual(r.status_code,200,r.text);qid=r.json()['id']
  qs=self.c.post('/api/quizzes/'+qid+'/start').json()['questions'];allowed={x['id'] for x in self.s['concepts'] if 'Application Development' in x['modules']};self.assertTrue(all(q['concept'] in allowed for q in qs))
  result=self.c.post('/api/quizzes/'+qid+'/submit',json={'answers':{},'finish':True}).json()['result'];self.assertEqual(result['modules']['Application Development']['unanswered'],6)
  self.assertEqual(self.c.post(self.b+'/quizzes',json={'moduleWeights':{'fake':1}}).status_code,422)
 def test_copy_and_privacy(self):
  self.answer(self.s['questions'][0],True)
  r=self.c.post('/api/courses/python',json={'subjectIds':[self.sid]});self.assertEqual(r.status_code,200,r.text);self.assertEqual(r.json()['copiedAttempts'],1)
  self.assertEqual(self.c.get(self.b).json()['learning']['answers'],1)
  self.assertEqual(self.c.get('/api/subjects/'+r.json()['id']).json()['learning']['answers'],1)
  self.assertEqual(self.c.get(self.b+'/sources/concept:classes').status_code,200)
  with TestClient(app) as other:
   other.post('/api/auth/register',json={'name':'Other','email':uuid.uuid4().hex+'@example.test','password':'testing-password'})
   self.assertEqual(other.get(self.b+'/sources/concept:classes').status_code,404);self.assertEqual(other.get(self.b+'/learning-hub').status_code,404)
 def test_reviewed_import(self):
  n=len(self.c.get('/api/subjects').json())
  with patch('app.learning.generate',new=AsyncMock(return_value=json.dumps(combined()))):r=self.c.post('/api/courses/syllabus/draft',json={'text':'Python syllabus covering classes and functions.','name':'Python'})
  self.assertEqual(r.status_code,200,r.text);self.assertEqual(len(self.c.get('/api/subjects').json()),n)
  self.assertEqual(self.c.post('/api/courses/syllabus/commit',json=r.json()['draft']).status_code,200)
  invalid=combined();invalid['concepts'][0]['prereqs']=['missing'];self.assertEqual(self.c.post('/api/courses/syllabus/commit',json=invalid).status_code,422)
 def test_evaluation_order(self):
  now=datetime.now(timezone.utc);a=[{'id':str(i),'concept':'functions','correct':i%2,'hint':False,'created_at':(now+timedelta(seconds=i)).isoformat()} for i in range(30)];seen=[]
  def predict(past,target):self.assertNotIn(target,past);seen.append(len(past));return .5
  r=evaluate(a,predict);self.assertEqual(r['holdout'],9);self.assertEqual(seen,list(range(21,30)));self.assertFalse(evaluate(a[:5])['available'])
 def test_code_references(self):
  es=self.c.get('/api/code').json()['exercises'];self.assertEqual(len(es),23)
  for e in es:
   if 'solution' not in e:continue
   ns={};exec(e['solution'],ns)
   for t in e['tests']:self.assertEqual(ns['solve'](*t['input']),t['expected'],e['id'])
