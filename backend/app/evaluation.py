"""Chronological next-response evaluation; no random-row split or future features."""
import math
from .engine import update_mastery

def metrics(targets, probs):
    n=len(targets)
    if not n:return None
    ps=[min(.999999,max(.000001,p)) for p in probs]
    return {'n':n,'accuracy':round(sum((p>=.5)==bool(y) for y,p in zip(targets,ps))/n,4),'brier':round(sum((p-y)**2 for y,p in zip(targets,ps))/n,4),'logLoss':round(-sum(y*math.log(p)+(1-y)*math.log(1-p) for y,p in zip(targets,ps))/n,4)}

def evaluate(attempts, gru=None):
    a=sorted(attempts,key=lambda x:(x['created_at'],x.get('id','')))
    if len(a)<20:return {'available':False,'message':f'Need at least 20 answers for a small chronological check; currently {len(a)}. More evidence is needed for reliable conclusions.'}
    cut=max(1,int(.7*len(a))); train=a[:cut];test=a[cut:]; baseline=(sum(x['correct'] for x in train)+1)/(len(train)+2)
    state={};ys=[];bp=[];base=[];gp=[];gy=[];past=[]
    for i,x in enumerate(a):
        m=state.get(x['concept'],35)
        if i>=cut:
            ys.append(int(x['correct']));base.append(baseline);bp.append(m/100*.88+(1-m/100)*.25)
            if gru:
                p=gru(past,x)
                if p is not None:gp.append(p);gy.append(int(x['correct']))
        state[x['concept']]=update_mastery(m,bool(x['correct']),bool(x.get('hint',0)));past.append(x)
    return {'available':True,'provenance':'Observed account interactions; not synthetic','protocol':'First 70% warm-up, final 30% chronological online evaluation. Predict before each response; update history after it. No parameters fitted to holdout. Assistance is not a prediction input.','training':len(train),'holdout':len(test),'baseline':metrics(ys,base),'bkt':metrics(ys,bp),'gru':metrics(gy,gp),'gruNote':'Run scripts/evaluate_learning.py with --gru for the bundled frozen model on supported concepts. Its training data are synthetic. Scores cover only supported rows and are not directly comparable to full-course scores.','limitations':'Small single-learner samples and repeated questions limit generalization. This is next-response prediction, not exam forecasting or causal evidence.'}
