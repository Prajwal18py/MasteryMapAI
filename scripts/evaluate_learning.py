"""Evaluate an exported account locally; never sends learning data to a provider."""
import argparse,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from app.evaluation import evaluate
p=argparse.ArgumentParser();p.add_argument('export');p.add_argument('--gru',action='store_true');p.add_argument('--output',default='learning-evaluation.json');args=p.parse_args()
data=json.loads(Path(args.export).read_text(encoding='utf-8')); predict=None
if args.gru:
 import numpy as np,torch
 from app.models import load,model_dir
 from ml.features import IDS,vector,sequence
 model_dir_path=model_dir(); _,network=load(str(model_dir_path),(model_dir_path/'report.json').stat().st_mtime_ns)
 def predict(history,target):
  if target['concept'] not in IDS:return None
  history=[x for x in history if x['concept'] in IDS]
  tokens,length=sequence(history)
  with torch.no_grad():
   return float(torch.sigmoid(network(torch.tensor([tokens]),torch.tensor([length]),torch.tensor([vector(history,target['concept'],target.get('difficulty',2),target['created_at'])],dtype=torch.float32))).item())
results={}
for subject in data['subjects']:
 bank=subject['questions']
 if isinstance(bank,str):bank=json.loads(bank)
 difficulties={q['id']:q.get('difficulty',2) for q in bank}
 attempts=[{**a,'difficulty':difficulties.get(a['question_id'],2)} for a in data['attempts'] if a['subject_id']==subject['id']]
 results[subject['id']]={'name':subject['name'],**evaluate(attempts,predict)}
Path(args.output).write_text(json.dumps(results,indent=2),encoding='utf-8');print('Saved',args.output)
