"use client";
import {useEffect,useRef,useState} from "react";
import {Play,Square,Code2,Terminal,Check,RotateCcw,ChevronRight} from "lucide-react";
import PythonEditor from "./python-editor";
import styles from "./browser-code-lab.module.css";
type Draft={code:string;entry:string;hint:number;solution:boolean;result?:any;resultCode?:string;resultEntry?:string};
export default function BrowserCodeLab({storageKey="default"}:{storageKey?:string}) {
 const [exercises,setExercises]=useState<any[]>([]),[id,setId]=useState(""),[drafts,setDrafts]=useState<Record<string,Draft>>({}),[status,setStatus]=useState("idle"),[error,setError]=useState(""),[ready,setReady]=useState(false),[storageIssue,setStorageIssue]=useState(false),[resetConfirm,setResetConfirm]=useState(false),[outputTab,setOutputTab]=useState("tests");
 const worker=useRef<Worker|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const key="masterymap:code:v2:"+storageKey;
 const ex=exercises.find(x=>x.id===id);
 const draft:Draft=drafts[id]||{code:ex?.starter||"",entry:"solve",hint:0,solution:false};
 const busy=status!=="idle",code=draft.code,result=draft.result;
 function update(values:Partial<Draft>){setDrafts(old=>({...old,[id]:{...(old[id]||draft),...values}}))}
 function stop(){worker.current?.terminate();worker.current=null;if(timer.current)clearTimeout(timer.current);timer.current=null}
 useEffect(()=>{
  let live=true;setReady(false);
  fetch('/api/code').then(async r=>{if(!r.ok)throw Error('Could not load exercises. Check the backend and reload this page.');return r.json()}).then(d=>{
   if(!live)return;setExercises(d.exercises);
   let saved:any=null;try{saved=JSON.parse(localStorage.getItem(key)||'null')}catch{setStorageIssue(true)}
   const restored:Record<string,Draft>={};
   for(const item of d.exercises){const value=saved?.drafts?.[item.id];if(value&&typeof value.code==='string')restored[item.id]={code:value.code,entry:typeof value.entry==='string'?value.entry:'solve',hint:Number(value.hint)||0,solution:!!value.solution,result:value.result,resultCode:value.resultCode,resultEntry:value.resultEntry}}
   setDrafts(restored);setId(d.exercises.some((x:any)=>x.id===saved?.id)?saved.id:d.exercises[0]?.id||'');setReady(true);
  }).catch(e=>{if(live)setError(e.message)});
  return()=>{live=false;stop()};
 },[key]);
 useEffect(()=>{if(!ready)return;try{localStorage.setItem(key,JSON.stringify({id,drafts}));setStorageIssue(false)}catch{setStorageIssue(true)}},[ready,id,drafts,key]);
 function run(mode='tests'){
  if(!ex||busy||worker.current||!code.trim())return;
  if(mode==='tests'&&!/^[A-Za-z_]\w*$/.test(draft.entry)){setError('Enter a valid Python function name, such as solve or pos.');return}
  stop();update({result:null});setError('');setStatus('loading');setOutputTab(mode==='tests'?'tests':'console');
  const exerciseId=id,sentCode=code;
  const w=new Worker('/python-worker.mjs',{type:'module'});worker.current=w;
  function fail(message:string){if(worker.current!==w)return;stop();setError(message);setStatus('idle')}
  timer.current=setTimeout(()=>fail('Python download timed out. Check your internet connection and try again.'),90000);
  w.onerror=()=>fail('The browser Python runtime could not start. Check access to cdn.jsdelivr.net and try again.');
  w.onmessage=({data})=>{
   if(worker.current!==w)return;
   if(data.type==='ready'){
    if(timer.current)clearTimeout(timer.current);setStatus('running');timer.current=setTimeout(()=>fail('Stopped after 10 seconds. Check for an infinite loop or reduce the amount of work.'),10000);
    w.postMessage({code:sentCode,tests:ex.tests,entry:draft.entry,mode});
   }else if(data.type==='result'){
    stop();setDrafts(old=>({...old,[exerciseId]:{...(old[exerciseId]||draft),result:data.result,resultCode:sentCode,resultEntry:draft.entry}}));setStatus('idle');
   }else if(data.type==='error')fail(data.message);
  };
 }
 const stale=result&&(draft.resultCode!==code||(result.mode==='tests'&&draft.resultEntry!==draft.entry));
 return <div className={styles.lab}>
  <div className={styles.heading}><div><span className="eyebrow">FROM UNDERSTANDING TO WORKING CODE</span><h2>Your Python workbench.</h2><p>Write, test, and understand one idea at a time.</p></div><span className={styles.saved}>{storageIssue?'Draft saving unavailable':ready?'Drafts saved in this browser':'Loading exercises…'}</span></div>
  <div className={styles.workspace}>
   <aside className={styles.brief}>
    <div className={styles.sectionLabel}><Code2 size={16}/> EXERCISE BRIEF</div>
    <label>Choose exercise<select value={id} disabled={busy||!ready} onChange={e=>{setId(e.target.value);setError('');setResetConfirm(false)}}>{exercises.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
    <h3>{ex?.title}</h3><p>{ex?.prompt}</p>
    <div className={styles.contract}><span>Default function</span><code>{ex?.starter?.split('\n')[0]||'def solve(...):'}</code><small>Return your answer. Tests compare the returned value, not printed output.</small></div>
    <h4>Public examples <span>{ex?.tests?.length||0}</span></h4>
    <div className={styles.examples}>{ex?.tests?.map((t:any,i:number)=><div key={i}><small>CASE {String(i+1).padStart(2,'0')}</small><code>{draft.entry}({t.input.map((x:any)=>JSON.stringify(x)).join(', ')})</code><span><ChevronRight size={13}/><code>{JSON.stringify(t.expected)}</code></span></div>)}</div>
    <details className={styles.support}><summary>Hints & reference solution</summary>{ex?.hints?.length?<><button className="secondary" disabled={draft.hint>=ex.hints.length} onClick={()=>update({hint:draft.hint+1})}>Reveal next hint</button>{ex.hints.slice(0,draft.hint).map((h:string,i:number)=><p key={i}>{i+1}. {h}</p>)}</>:<p>Start with the default function. Try an empty input, then the first public example.</p>}{ex?.solution&&<><button className="link" onClick={()=>update({solution:!draft.solution})}>{draft.solution?'Hide':'Show'} reference solution</button>{draft.solution&&<pre>{ex.solution}</pre>}</>}</details>
   </aside>
   <section className={styles.workbench} aria-label="Python workbench">
    <div className={styles.toolbar}><label>Function to test<input aria-label="Function to test" value={draft.entry} disabled={busy} onChange={e=>update({entry:e.target.value})}/></label><button className={styles.reset} disabled={busy} onClick={()=>setResetConfirm(!resetConfirm)}><RotateCcw size={14}/> Reset starter</button></div>
    {resetConfirm&&<div className={styles.confirm}>Replace this exercise’s draft with the starter?<button onClick={()=>{update({code:ex.starter,entry:'solve',result:null,resultCode:''});setResetConfirm(false)}}>Reset this draft</button><button onClick={()=>setResetConfirm(false)}>Keep my code</button></div>}
    <PythonEditor value={code} onChange={v=>update({code:v})} disabled={busy||!ready} onRun={()=>run()}/>
    <div className={styles.actions}><button className="primary" disabled={busy||!ready||!code.trim()} onClick={()=>run()}><Play size={15}/> Run tests</button><button className="secondary" disabled={busy||!ready||!code.trim()} onClick={()=>run('script')}>Run script</button>{busy&&<button className="secondary" onClick={()=>{stop();setStatus('idle');setError('Execution stopped. Your code is saved.')}}><Square size={14}/> Stop</button>}<span role="status">{status==='loading'?'Starting Python…':status==='running'?'Executing…':'Ctrl + Enter to test'}</span></div>
    {error&&<div className={styles.error} role="alert">{error}</div>}
    <section className={styles.output} aria-label="Execution results">
     <div className={styles.outputHead}><div><button aria-pressed={outputTab==='tests'} onClick={()=>setOutputTab('tests')}><Check size={14}/> Tests</button><button aria-pressed={outputTab==='console'} onClick={()=>setOutputTab('console')}><Terminal size={14}/> Console</button></div>{result&&<span>{stale?'Code changed · run again':result.mode==='script'?(result.error?'Script failed':'Script finished'):`${result.passed} / ${result.total} passed`}</span>}</div>
     {result?.error&&<div className={styles.error} role="alert"><b>{result.line?`Line ${result.line} · `:''}{result.error}</b>{result.details&&<details><summary>Technical traceback</summary><pre>{result.details}</pre></details>}</div>}
     {outputTab==='console'?<pre className={styles.console}>{result?.stdout||'Your print() output will appear here. Use Run script to execute code without public tests.'}</pre>:result?.results?.length?<div className={styles.testList}>{result.results.map((t:any,i:number)=><details key={i} open={!t.passed}><summary><span className={t.passed?styles.pass:styles.fail}>{t.passed?'PASS':'FAIL'}</span>Case {i+1}<span>{t.passed?'Output matches':'Review result'}</span></summary><div><p><b>Input</b><code>{JSON.stringify(t.input)}</code></p><p><b>Expected</b><code>{JSON.stringify(t.expected)}</code></p><p><b>{t.error?'Error':'Actual'}</b><code>{t.error||t.actual}</code></p></div></details>)}</div>:<div className={styles.empty}><Terminal size={22}/><p>{busy?'Preparing your run…':'Ready when you are.'}</p><small>Run the public tests to compare actual and expected results.</small></div>}
    </section>
    <p className={styles.footnote}>First run needs internet to load Python. Runs stop after 10 seconds. Drafts are local to this browser; test results are practice feedback and do not update mastery.</p>
   </section>
  </div>
 </div>;
}
