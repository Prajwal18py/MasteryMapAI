"""One course with shared concept identities across modules."""
import json
from pathlib import Path

def combined():
    pack=json.loads((Path(__file__).resolve().parents[1]/'curriculum/python-syllabus.json').read_text(encoding='utf-8'))
    concepts={}; questions={}
    for module in pack['modules']:
        label=module['name'].split(' — ',1)[-1]
        for item in module['concepts']:
            c=concepts.setdefault(item['id'], {**item,'modules':[]})
            if label not in c['modules']: c['modules'].append(label)
        for q in module['questions']:
            questions.setdefault(q['id'],{**q,'kind': 'code-output' if 'printed' in q['prompt'].lower() or 'what is ' in q['prompt'].lower() else 'scenario' if len(q['prompt'])>95 else 'conceptual'})
    extra=Path(__file__).resolve().parents[1]/'curriculum/extra-questions.json'
    if extra.exists():
        for q in json.loads(extra.read_text()): questions[q['id']]=q
    return {'name':'Python — Complete Course','description':'Five modules, shared knowledge and one learning history.','concepts':list(concepts.values()),'questions':list(questions.values())}
