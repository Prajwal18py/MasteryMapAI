// Browser practice only; run personal code, not untrusted third-party programs.
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.mjs";
let runtime;
try {
  runtime = await loadPyodide({indexURL:"https://cdn.jsdelivr.net/pyodide/v0.27.7/full/"});
  const response=await fetch('/python-runner.py');
  if(!response.ok)throw Error('Missing python-runner.py. Copy the public files from the patch.');
  await runtime.runPythonAsync(await response.text());
  postMessage({type:'ready'});
} catch(error) {postMessage({type:'error',message:'Python could not load. Check internet access and the public runtime files. '+String(error)});}
self.onmessage=async({data})=>{
 try {
  runtime.globals.set('_source',data.code);
  runtime.globals.set('_tests_json',JSON.stringify(data.tests||[]));
  runtime.globals.set('_entry',data.entry||'solve');
  runtime.globals.set('_mode',data.mode||'tests');
  const raw=await runtime.runPythonAsync('import json\njson.dumps(run_student(_source, json.loads(_tests_json), _entry, _mode))');
  postMessage({type:'result',result:JSON.parse(raw)});
 } catch(error){postMessage({type:'error',message:'The Python runner could not finish. '+String(error)});}
};
