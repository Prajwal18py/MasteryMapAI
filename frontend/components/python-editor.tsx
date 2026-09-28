"use client";
import {useRef, useState} from "react";
import {editPython} from "./python-edit.mjs";
import styles from "./browser-code-lab.module.css";
export default function PythonEditor({value,onChange,onRun,disabled}:{value:string;onChange:(s:string)=>void;onRun:()=>void;disabled:boolean}) {
 const editor=useRef<HTMLTextAreaElement>(null),gutter=useRef<HTMLDivElement>(null);
 const [position,setPosition]=useState({line:1,column:1}),[captureTab,setCaptureTab]=useState(true);
 function locate(){const t=editor.current;if(!t)return;const lines=t.value.slice(0,t.selectionStart).split('\n');setPosition({line:lines.length,column:lines[lines.length-1].length+1})}
 return <div className={styles.editorShell}>
  <div className={styles.filebar}><span><i/> main.py</span><span>Python · UTF-8</span></div>
  <div className={styles.editorBody}>
   <div className={styles.gutter} ref={gutter} aria-hidden>{value.split('\n').map((_,i)=><div key={i}>{i+1}</div>)}</div>
   <textarea ref={editor} className={styles.editor} aria-label="Python code" aria-describedby="python-editor-help" value={value} spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" disabled={disabled} onChange={e=>{onChange(e.target.value);locate()}} onSelect={locate} onScroll={e=>{if(gutter.current)gutter.current.scrollTop=e.currentTarget.scrollTop}} onKeyDown={e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();onRun();return}
    if(e.key==='Escape'){setCaptureTab(false);return}
    if(e.key==='Tab'&&!captureTab)return;
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    const t=e.currentTarget,edit=editPython(value,t.selectionStart,t.selectionEnd,e.key,e.shiftKey);
    if(edit){e.preventDefault();onChange(edit.code);requestAnimationFrame(()=>{t.setSelectionRange(edit.start,edit.end);locate()})}
   }} onFocus={()=>setCaptureTab(true)} />
  </div>
  <div className={styles.editorFooter}><span>Ln {position.line}, Col {position.column}</span><span>Spaces: 4 · Auto-indent</span></div>
  <p id="python-editor-help" className={styles.keyboard}>Tab / Shift+Tab: indent · Ctrl+Enter: run · Esc then Tab: leave editor</p>
 </div>
}
