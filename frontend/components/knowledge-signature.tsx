"use client";
import styles from "./knowledge-signature.module.css";

type Concept = { id:string; name:string; modules?:string[]; mastery:number|null; attempts:number };
const tone = (c:Concept) => !c.attempts || c.mastery == null ? "#a5a3b8" : c.mastery >= 95 ? "#15803d" : c.mastery >= 80 ? "#0f766e" : c.mastery >= 60 ? "#b7791f" : "#c45b52";
export default function KnowledgeSignature({concepts}:{concepts:Concept[]}) {
 const modules = [...new Set(concepts.flatMap(c=>c.modules?.length?c.modules:["Core concepts"]))];
 return <div className={styles.root}>
  <p className={styles.intro}>Your course, grouped by module. Expand a module to see each concept.</p>
  {modules.map((name,index)=>{
   const items=concepts.filter(c=>(c.modules?.length?c.modules:["Core concepts"]).includes(name));
   const assessed=items.filter(c=>c.attempts>0&&c.mastery!=null);
   const average=assessed.length?Math.round(assessed.reduce((n,c)=>n+c.mastery!,0)/assessed.length):null;
   return <details className={styles.module} key={name}>
    <summary><span className={styles.index}>{String(index+1).padStart(2,"0")}</span><span className={styles.label}><strong>{name}</strong><small>{assessed.length} of {items.length} concepts assessed</small></span><b>{average==null?"—":`${average}%`}</b><span className={styles.chevron} aria-hidden>⌄</span></summary>
    <div className={styles.topics}>{items.map(c=><div className={styles.topic} key={c.id}><div><span>{c.name}</span><b>{!c.attempts||c.mastery==null?"Unassessed":`${c.mastery}%`}</b></div><div className={styles.track}><span style={{width:!c.attempts||c.mastery==null?0:`${c.mastery}%`,background:tone(c)}} /></div></div>)}</div>
   </details>;
  })}
  <p className={styles.note}>Module averages use assessed concepts only. Unassessed topics have no score. Shared concepts can appear in more than one module.</p>
 </div>;
}
