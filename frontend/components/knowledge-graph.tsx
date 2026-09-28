"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./knowledge-graph.module.css";

type Concept = { id: string; name: string; mastery: number | null; prereqs: string[] };
const tone = (n: number | null) => n == null ? "neutral" : n < 60 ? "low" : n < 80 ? "developing" : n < 95 ? "strong" : "mastered";
export default function KnowledgeGraph({ cs, selected, onSelect, compact = false }: {
  cs: Concept[]; selected: string; onSelect: (id: string) => void; compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const anchor = cs.find(c => c.id === selected) || cs[0];
  const nearby = useMemo(() => {
    if (!anchor) return [];
    const direct = cs.filter(c => anchor.prereqs?.includes(c.id) || c.prereqs?.includes(anchor.id));
    return [anchor, ...direct, ...cs.filter(c => c.id !== anchor.id && !direct.includes(c))];
  }, [cs, anchor]);
  const visible = compact ? nearby.slice(0, 6) : cs.filter(c =>
    (!focus || c.id === anchor?.id || anchor?.prereqs?.includes(c.id) || c.prereqs?.includes(anchor?.id || "")) &&
    (!query.trim() || c.name.toLowerCase().includes(query.trim().toLowerCase())));
  const columns = compact ? 2 : Math.min(4, Math.max(1, Math.ceil(Math.sqrt(visible.length))));
  const width = columns * 248 + 24;
  const height = Math.max(180, Math.ceil(visible.length / columns) * 118 + 24);
  const positions = new Map(visible.map((c, i) => [c.id, { x: 24 + (i % columns) * 248, y: 24 + Math.floor(i / columns) * 118 }]));
  useEffect(() => { viewport.current?.scrollTo(0, 0); }, [query, focus, cs.length]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
      if (event.key === "Tab") {
        const controls = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, [tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", key); expandButton.current?.focus(); };
  }, [expanded]);
  return <div ref={panel} tabIndex={expanded ? -1 : undefined} role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} aria-label="Knowledge map" className={`${styles.map} ${compact ? styles.compact : ""} ${expanded ? styles.expanded : ""}`}>
    <div className={styles.toolbar}>
      {compact ? <span className={styles.caption}>A closer look · {visible.length} of {cs.length} topics</span> : <>
        <input aria-label="Search map topics" placeholder="Find a topic…" value={query} onChange={e => setQuery(e.target.value)} />
        <button aria-pressed={focus} onClick={() => setFocus(v => !v)}>{focus ? "Show all topics" : "Focus topic"}</button>
        <button aria-label="Zoom out" disabled={zoom <= .85} onClick={() => setZoom(z => Math.max(.85, z - .15))}>−</button>
        <span className={styles.caption}>{Math.round(zoom * 100)}%</span>
        <button aria-label="Zoom in" disabled={zoom >= 1.6} onClick={() => setZoom(z => Math.min(1.6, z + .15))}>+</button>
        <button onClick={() => { setZoom(1); setQuery(""); setFocus(false); viewport.current?.scrollTo(0, 0); }}>Reset</button>
        <button ref={expandButton} onClick={() => setExpanded(v => !v)}>{expanded ? "Close map" : "Expand map"}</button>
      </>}
    </div>
    {!visible.length ? <div className={styles.empty}>No topics match this view. Try another search or reset the map.</div> : <div ref={viewport} className={styles.viewport} tabIndex={0} aria-label="Scrollable topic map">
      <div style={{ width: width * zoom, height: height * zoom, position: "relative" }}>
        <div className={styles.canvas} style={{ width, height, transform: `scale(${zoom})` }}>
          <svg className={styles.edges} width={width} height={height} aria-hidden="true">
            {visible.flatMap(c => (c.prereqs || []).map(id => {
              const a = positions.get(id), b = positions.get(c.id);
              if (!a || !b) return null;
              const x1 = a.x + 108, y1 = a.y + 88, x2 = b.x + 108, y2 = b.y;
              return <path key={`${id}-${c.id}`} className={selected === id || selected === c.id ? styles.activeEdge : ""} d={`M ${x1} ${y1} C ${x1} ${y1 + 22}, ${x2} ${y2 - 22}, ${x2} ${y2}`} />;
            }))}
          </svg>
          {visible.map(c => {
            const p = positions.get(c.id)!;
            return <button key={c.id} title={c.name} className={`${styles.node} ${styles[tone(c.mastery)]} ${c.id === selected ? styles.selected : ""}`} style={{ left: p.x, top: p.y }} onClick={() => onSelect(c.id)} aria-pressed={c.id === selected}>
              <strong>{c.name}</strong><span><i />{c.mastery == null ? "Unassessed" : `${Math.round(c.mastery)}% mastery`}</span>
            </button>;
          })}
        </div>
      </div>
    </div>}
    <div className={styles.footer}>{compact ? "Select a topic to open the full map." : `${visible.length} of ${cs.length} topics · Lines connect prerequisites to the topics they support.`}<span>Scroll to explore ↔</span></div>
  </div>;
}
