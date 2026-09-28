"use client";
import KnowledgeGraph from "../components/knowledge-graph";
import { LearningStudio, ConnectedPractice, EvidencePanel } from "../components/learning-studio";
import PremiumLogin from "../components/premium-login";
import KnowledgeSignature from "../components/knowledge-signature";
import StudentMarkdown from "../components/student-markdown";
import BrowserCodeLab from "../components/browser-code-lab";
import StudyTrace from "../components/study-trace";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Compass,
  LayoutDashboard,
  Target,
  Network,
  Sparkles,
  Brain,
  CalendarDays,
  TrendingUp,
  BookOpen,
  FileText,
  Code2,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  ChevronDown,
  Check,
  Clock,
  Upload,
  Send,
  LogOut,
  Menu,
  X,
  Play,
  Download,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Trash2,
  FolderOpen,
  FlaskConical,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  BarChart,
  Bar,
  Legend,
} from "recharts";
const nav = [
  ["Overview", LayoutDashboard],
  ["Courses", BookOpen],
  ["Revision", Clock],
  ["Mistakes", RefreshCw],
  ["Course Builder", Plus],
  ["Learning Evidence", FlaskConical],
  ["Adaptive Practice", Target],
  ["Mastery Map", Network],
  ["AI Tutor", Sparkles],
  ["Digital Twin", Brain],
  ["Exam Readiness", TrendingUp],
  ["Study Plan", CalendarDays],
  ["Quizzes", BookOpen],
  ["Progress", TrendingUp],
  ["Materials", FileText],
  ["Subjects", FolderOpen],
  ["Code Lab", Code2],
  ["Model Lab", FlaskConical],
  ["Settings", SlidersHorizontal],
] as const;
async function api(path: string, data?: any, method?: string) {
  const r = await fetch("/api/" + path, {
    method: method || (data === undefined ? "GET" : "POST"),
    headers:
      data === undefined ? undefined : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  let j: any;
  try {
    j = await r.json();
  } catch {
    throw Error("Server connection failed. Check that the backend is running.");
  }
  if (!r.ok) throw Error(j.error || (typeof j.detail === "string" ? j.detail : j.detail?.[0]?.msg) || "Request failed");
  return j;
}
const fmt = (v: any, s = "%") => (v == null ? "—" : `${v}${s}`);
const state = (c: any) =>
  !c.attempts
    ? "neutral"
    : c.mastery >= 95
      ? "mastered"
      : c.mastery >= 80
        ? "strong"
        : c.mastery >= 60
          ? "developing"
          : "focus";
const download = (name: string, value: any) => {
  const a = document.createElement("a");
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};
function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="empty">
      <Compass size={28} />
      <h3>{title}</h3>
      <p>
        {detail || "Your learning evidence will appear here as you practise."}
      </p>
    </div>
  );
}
function Tag({ children, tone = "neutral" }: any) {
  return <span className={"tag " + tone}>{children}</span>;
}
function Ring({
  value,
  label,
  size = 128,
}: {
  value: number | null;
  label?: string;
  size?: number;
}) {
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="51" stroke="#e7e9e2" />
        <circle
          cx="60"
          cy="60"
          r="51"
          stroke="currentColor"
          strokeDasharray={`${(value || 0) * 3.204} 321`}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div>
        <strong>{fmt(value)}</strong>
        <small>{label || "mastery"}</small>
      </div>
    </div>
  );
}
function Trend({ data }: { data: any[] }) {
  return data.length ? (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="tealfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22786e" stopOpacity={0.24} />
            <stop offset="100%" stopColor="#22786e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#e4e7df" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="accuracy"
          stroke="#237e72"
          strokeWidth={2.5}
          fill="url(#tealfill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  ) : (
    <Empty
      title="The first step is yours"
      detail="Complete a practice question to start your progress timeline."
    />
  );
}
function Login({ onLogin }: any) {
  return <PremiumLogin onLogin={onLogin} authenticate={api} />;
}
export default function App() {
  const [user, setUser] = useState<any>(undefined);
  useEffect(() => {
    api("auth/me")
      .then(setUser)
      .catch(() => setUser(null));
  }, []);
  if (user === undefined)
    return (
      <div className="boot">
        <Compass />
        <span>Opening your learning studio…</span>
      </div>
    );
  return user ? (
    <Workspace
      user={user}
      logout={async () => {
        await api("auth/logout", {});
        setUser(null);
      }}
    />
  ) : (
    <Login onLogin={setUser} />
  );
}
function Workspace({ user, logout }: any) {
  const [view, setView] = useState("Overview"),
    [subjects, setSubjects] = useState<any[]>([]),
    [sid, setSid] = useState(""),
    [bundle, setBundle] = useState<any>(null),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [selected, setSelected] = useState(""),
    [topic, setTopic] = useState("all"),
    [q, setQ] = useState<any>(null),
    [choice, setChoice] = useState<number | null>(null),
    [feedback, setFeedback] = useState<any>(null),
    [hint, setHint] = useState(""),
    [started, setStarted] = useState(Date.now()),
    [attempt, setAttempt] = useState("");
  const [visited, setVisited] = useState<string[]>(["Overview"]);
  const activeView = view;
  const [graphModule, setGraphModule] = useState("all");
  const reduce = useReducedMotion();
  const searchRef = useRef<HTMLInputElement>(null);
  const s = bundle?.subject,
    d = bundle?.learning,
    cs = d?.concepts || [];
  const endpoint = (tail: string) => `subjects/${sid}/${tail}`;
  async function loadSubjects() {
    const list = await api("subjects");
    setSubjects(list);
    return list;
  }
  async function refresh() {
    if (sid) setBundle(await api("subjects/" + sid));
  }
  useEffect(() => {
    loadSubjects()
      .then((x) => {
        if (x.length) setSid(x[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    let live = true;
    setBundle(null);
    setQ(null);
    setFeedback(null);
    setSelected("");
    setTopic("all");
    if (sid)
      api("subjects/" + sid)
        .then((x) => {
          if (live) setBundle(x);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    return () => {
      live = false;
    };
  }, [sid]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function go(v: string) {
    setVisited(old => old.includes(v) ? old : [...old, v]);
    setView(v);
    setMobile(false);
    setError("");
  }
  async function practice(concept = "all") {
    setTopic(concept);
    go("Adaptive Practice");
    await run(async () => {
      setQ(await api(endpoint("practice"), { concept }));
      setChoice(null);
      setFeedback(null);
      setHint("");
      setStarted(Date.now());
      setAttempt(crypto.randomUUID());
    });
  }
  const weak = [...cs].sort((a, b) => (a.mastery ?? 35) - (b.mastery ?? 35));
  const subtitle: Record<string, string> = {
    Overview: "A clear direction for your next learning session.",
    "Adaptive Practice": "The right challenge, at the right moment.",
    "Mastery Map": "Understand the connections behind your knowledge.",
    "AI Tutor": "Understand the reasoning. Then make it yours.",
    "Digital Twin": "A living record of how you learn.",
    "Exam Readiness": "Prepare with evidence, not guesswork.",
    "Study Plan": "Turn your learning signals into a deliberate plan.",
    Quizzes: "Make understanding visible.",
    Progress: "Small steps, measurable change.",
    Materials: "Your sources. Connected to your learning.",
    Subjects: "Build a curriculum that belongs to you.",
    "Code Lab": "Think it through. Write it. Test it.",
    "Model Lab": "Inspect the evidence behind the intelligence.",
    Settings: "Make this space your own.",
  };
  return (
    <div className="workspace">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <div className="wordmark">
          <Compass />
          mastery<span>map</span>
          <sup>AI</sup>
        </div>
        <div className="workspace-badge">
          <span className="live-dot" /> PERSONAL STUDIO <small>02</small>
        </div>
        <nav>
          {nav.map(([name, Icon], i) => (
            <div key={name}>
              {[0, 5, 9].includes(i) && (
                <p className="nav-section">
                  {i === 0
                    ? "LEARN"
                    : i === 5
                      ? "REFLECT & PLAN"
                      : "YOUR WORKSPACE"}
                </p>
              )}
              <button
                className={view === name ? "active" : ""}
                onClick={() =>
                  name === "Adaptive Practice" ? practice() : go(name)
                }
              >
                <Icon size={17} />
                {name}
                {name === "AI Tutor" && <span className="ai-dot">AI</span>}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar">{user.name[0]}</div>
          <div>
            <strong>{user.name}</strong>
            <small>Student workspace</small>
          </div>
          <button aria-label="Sign out" onClick={() => run(logout)}>
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{view}</strong>
          </div>
          <div className="global-search">
            <Search size={16} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a concept…"
              aria-label="Search concepts"
            />
            <kbd>⌘ K</kbd>
            {query && (
              <div className="search-results">
                {cs
                  .filter((c: any) =>
                    c.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelected(c.id);
                        go("Mastery Map");
                        setQuery("");
                      }}
                    >
                      {c.name}
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
              </div>
            )}
          </div>
          <div className="top-profile">
            <span className="live-dot" />
            Your private workspace
            <div className="avatar small">{user.name[0]}</div>
          </div>
        </header>
        <div className="page">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {view === "Overview"
                  ? "THE BIG PICTURE"
                  : "YOUR LEARNING STUDIO"}
              </span>
              <h1>
                {view === "Overview"
                  ? `Good to see you, ${user.name.split(" ")[0]}.`
                  : view}
              </h1>
              <p>{subtitle[view]}</p>
            </div>
            <div className="subject-select">
              <BookOpen size={16} />
              <select
                aria-label="Current subject"
                value={sid}
                onChange={(e) => setSid(e.target.value)}
              >
                {subjects.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && (
            <div role="alert" className="error">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="success">
              {notice}
              <button onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {!bundle ? (
            <Empty title="Loading your learning map…" />
          ) : (
            <>
            {visited.map(view => (
              <motion.div
                key={view + sid}
                hidden={view !== activeView}
                style={{ display: view === activeView ? undefined : "none" }}
                aria-label={view + " workspace"}
                initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {view === "Overview" && (
                  <>
                    <div className="overview-grid">
                      <section className="hero">
                        <div>
                          <Tag tone="dark">YOUR NEXT CHAPTER</Tag>
                          <h2>
                            Make your next
                            <br />
                            session <em>count.</em>
                          </h2>
                          <p>
                            {d.answers
                              ? `${d.answers} answers have shaped your map. ${weak[0]?.name} is a useful place to focus next.`
                              : "Start with a few questions. Your map will take shape from what you actually know."}
                          </p>
                          <button
                            className="primary copper"
                            onClick={() => practice(weak[0]?.id)}
                          >
                            Continue learning
                            <ArrowRight size={17} />
                          </button>
                        </div>
                        <div className="hero-map">
                          <div className="orbit orbit-a" />
                          <div className="orbit orbit-b" />
                          <div className="orbit-node n1">
                            {cs[0]?.name || "Discover"}
                          </div>
                          <div className="orbit-node n2">
                            {cs[1]?.name || "Connect"}
                          </div>
                          <div className="orbit-node n3">
                            {cs[2]?.name || "Master"}
                          </div>
                          <div className="orbit-center">
                            <Compass size={33} />
                            <small>YOUR KNOWLEDGE</small>
                          </div>
                        </div>
                        <span className="hero-caption">
                          A PERSONAL PATH. BUILT ON EVIDENCE.
                        </span>
                      </section>
                      <section className="card today">
                        <div className="card-head">
                          <span className="eyebrow">LEARNING PULSE</span>
                          <span className="live-dot" />
                        </div>
                        <Ring value={d.overall} size={144} />
                        <h3>
                          {d.answers
                            ? "Your understanding, mapped."
                            : "Every map starts somewhere."}
                        </h3>
                        <p>
                          {d.coverage}% concept coverage ·{" "}
                          {cs.filter((x: any) => x.attempts).length} assessed
                          topics
                        </p>
                        <button
                          className="link"
                          onClick={() => go("Digital Twin")}
                        >
                          Meet your digital twin
                          <ArrowUpRight size={15} />
                        </button>
                      </section>
                    </div>
                    <div className="stats">
                      {[
                        ["Mastery", fmt(d.overall), "Across assessed concepts"],
                        [
                          "Practice accuracy",
                          fmt(d.accuracy),
                          `${d.answers} recorded answers`,
                        ],
                        [
                          "Concept coverage",
                          `${d.coverage}%`,
                          `${cs.length} connected concepts`,
                        ],
                        [
                          "Next exam",
                          s.preferences.examDate || "Not set",
                          "Set your target in Exam Readiness",
                        ],
                      ].map(([a, b, c]) => (
                        <article className="stat" key={a}>
                          <span>{a}</span>
                          <strong>{b}</strong>
                          <small>{c}</small>
                        </article>
                      ))}
                    </div>
                    <div className="grid two">
                      <section className="card">
                        <div className="card-head">
                          <div>
                            <span className="eyebrow">
                              CONNECTED UNDERSTANDING
                            </span>
                            <h2>Your mastery map</h2>
                          </div>
                          <button
                            className="icon-button"
                            aria-label="Open mastery map"
                            onClick={() => go("Mastery Map")}
                          >
                            <ArrowUpRight size={20} />
                          </button>
                        </div>
                        <KnowledgeGraph
                          cs={cs}
                          selected={selected}
                          onSelect={(id) => {
                            setSelected(id);
                            go("Mastery Map");
                          }}
                          compact
                        />
                      </section>
                      <section className="card">
                        <div className="card-head">
                          <div>
                            <span className="eyebrow">A LITTLE, EVERY DAY</span>
                            <h2>Learning momentum</h2>
                          </div>
                          <Tag>Observed</Tag>
                        </div>
                        <Trend data={d.trend} />
                      </section>
                      <section className="card">
                        <h2>Where to focus next</h2>
                        {weak.slice(0, 3).map((c: any, i: number) => (
                          <button
                            key={c.id}
                            className="topic-row"
                            onClick={() => practice(c.id)}
                          >
                            <span className="index">0{i + 1}</span>
                            <div>
                              <strong>{c.name}</strong>
                              <small>
                                {c.attempts
                                  ? `${c.attempts} answers · ${c.confidence.toLowerCase()} evidence`
                                  : "Start with a diagnostic question"}
                              </small>
                            </div>
                            <Tag tone={state(c)}>{fmt(c.mastery)}</Tag>
                            <ArrowUpRight size={16} />
                          </button>
                        ))}
                      </section>
                      <section className="card insight">
                        <Sparkles size={24} />
                        <span className="eyebrow">A PLAN WITH A REASON</span>
                        <h2>
                          Less deciding.
                          <br />
                          More understanding.
                        </h2>
                        <p>
                          Let the study workflow inspect your gaps, retrieve
                          references, and propose a plan you can review.
                        </p>
                        <button
                          className="secondary"
                          onClick={() => go("Study Plan")}
                        >
                          Build my study plan
                          <ArrowRight size={16} />
                        </button>
                      </section>
                    </div>
                  </>
                )}
                {view === "Adaptive Practice" && <ConnectedPractice key={sid+topic} sid={sid} cs={cs} initial={topic} refresh={refresh}/>}
                {["Courses","Revision","Mistakes","Course Builder","Learning Evidence"].includes(view) && <LearningStudio key={sid+view} sid={sid} mode={view} active={view === activeView} subjects={subjects} practice={practice} onCourse={async(id)=>{await loadSubjects();setSid(id);go("Courses")}}/>}
                {view === "Mastery Map" && (
                  <div className="grid map-grid">
                    <section className="card map-card">
                      <div className="card-head">
                        <div>
                          <span className="eyebrow">{s.name}</span>
                          <h2>Everything is connected.</h2>
                        </div>
                        <Tag>{cs.length} concepts</Tag>
                      </div>
                      <label>Module focus<select value={graphModule} onChange={e=>setGraphModule(e.target.value)}><option value="all">All modules</option>{Array.from(new Set(cs.flatMap((c:any)=>c.modules||[]))).map((m:any)=><option key={m}>{m}</option>)}</select></label>
                      <KnowledgeGraph
                        cs={graphModule==='all'?cs:cs.filter((c:any)=>c.modules?.includes(graphModule))}
                        selected={selected}
                        onSelect={setSelected}
                      />
                      <div className="legend">
                        {[
                          ["neutral", "Unassessed"],
                          ["focus", "Needs focus"],
                          ["developing", "Developing"],
                          ["strong", "Strong"],
                          ["mastered", "Mastered"],
                        ].map(([tone, label]) => (
                          <span key={tone}>
                            <i className={tone} />
                            {label}
                          </span>
                        ))}
                      </div>
                      <p className="note">
                        Select a topic to inspect its evidence. Scroll the canvas to explore, or use Focus topic to see its connections.
                      </p>
                    </section>
                    <section className="card inspector">
                      {(() => {
                        const c =
                          cs.find((x: any) => x.id === selected) || weak[0];
                        return c ? (
                          <>
                            <Tag tone={state(c)}>
                              {c.attempts
                                ? "CONCEPT INTELLIGENCE"
                                : "UNASSESSED"}
                            </Tag>
                            <h2>{c.name}</h2>
                            <div className="big-number">{fmt(c.mastery)}</div>
                            <p>{c.summary}</p>
                            {[
                              ["Evidence confidence", c.confidence],
                              ["Forgetting risk", c.risk],
                              ["Recent change", fmt(c.change, " pp")],
                            ].map(([k, v]) => (
                              <div className="data-row" key={k}>
                                <span>{k}</span>
                                <strong>{v}</strong>
                              </div>
                            ))}
                            <h3>Prerequisite check</h3>
                            {c.prereqs.length ? (
                              c.prereqs.map((p: string) => (
                                <button
                                  className="topic-row"
                                  key={p}
                                  onClick={() => setSelected(p)}
                                >
                                  {cs.find((x: any) => x.id === p)?.name}
                                  <ArrowUpRight size={15} />
                                </button>
                              ))
                            ) : (
                              <p>A foundation concept. Start here.</p>
                            )}
                            <button
                              className="primary"
                              onClick={() => practice(c.id)}
                            >
                              Practise this concept
                              <ArrowRight size={16} />
                            </button>
                          </>
                        ) : null;
                      })()}
                    </section>
                  </div>
                )}
                {view === "AI Tutor" && (
                  <TutorPanel
                    key={sid}
                    sid={sid}
                    cs={cs}
                    ai={bundle.ai}
                    run={run}
                    busy={busy}
                  />
                )}
                {view === "Digital Twin" && (
                  <>
                    <section className="section-banner">
                      <div>
                        <span className="eyebrow">LEARNER INTELLIGENCE</span>
                        <h2>
                          A profile that evolves
                          <br />
                          with your understanding.
                        </h2>
                        <p>
                          Built from your answers, their timing and the
                          connections between concepts.
                        </p>
                      </div>
                      <Ring value={d.coverage} label="coverage" />
                    </section>
                    <div className="dimension-grid">
                      {d.dimensions.map((x: any) => (
                        <article className="stat" key={x.name}>
                          <span>{x.name}</span>
                          <strong>{fmt(x.value, x.unit)}</strong>
                        </article>
                      ))}
                    </div>
                    <div className="grid two">
                      <section className="card">
                        <h2>Your knowledge signature</h2>
                        <KnowledgeSignature concepts={cs} />
                      </section>
                      <section className="card">
                        <h2>Keep these ideas fresh</h2>
                        {cs
                          .filter((c: any) => c.attempts)
                          .map((c: any) => (
                            <button
                              className="topic-row"
                              key={c.id}
                              onClick={() => practice(c.id)}
                            >
                              <div>
                                <strong>{c.name}</strong>
                                <small>
                                  Last demonstrated {c.mastery}% → estimated
                                  retained {c.retention}%
                                </small>
                              </div>
                              <Tag
                                tone={c.risk === "High" ? "focus" : "neutral"}
                              >
                                {c.risk}
                              </Tag>
                            </button>
                          ))}
                        {!d.answers && (
                          <Empty title="No retention evidence yet" />
                        )}
                        <p className="note">
                          Retention uses a time-decay scheduling heuristic. It
                          is not a validated forgetting forecast.
                        </p>
                      </section>
                      <section className="card">
                        <h2>Strengths to build on</h2>
                        {[...cs]
                          .filter((c: any) => c.attempts)
                          .sort((a, b) => b.mastery - a.mastery)
                          .slice(0, 3)
                          .map((c: any) => (
                            <div className="topic-row" key={c.id}>
                              <strong>{c.name}</strong>
                              <Tag tone={state(c)}>{fmt(c.mastery)}</Tag>
                            </div>
                          ))}
                      </section>
                      <EvidencePanel sid={sid}/>
                      <Reflection sid={sid} cs={cs} run={run} busy={busy} />
                    </div>
                  </>
                )}
                {view === "Exam Readiness" && (
                  <Readiness
                    bundle={bundle}
                    sid={sid}
                    run={run}
                    refresh={refresh}
                    practice={practice}
                    plan={() => go("Study Plan")}
                  />
                )}
                {view === "Study Plan" && (
                  <PlanPanel
                    key={sid}
                    sid={sid}
                    run={run}
                    busy={busy}
                    practice={practice}
                    ai={bundle.ai}
                  />
                )}
                {view === "Quizzes" && (
                  <QuizPanel
                    key={sid}
                    sid={sid}
                    run={run}
                    busy={busy}
                    refresh={refresh}
                  />
                )}
                {view === "Progress" && (
                  <>
                    <div className="stats">
                      {[
                        ["Answers", d.answers],
                        ["Accuracy", fmt(d.accuracy)],
                        ["Distinct questions", d.distinctQuestions],
                        ["Days active", d.trend.length],
                      ].map(([k, v]) => (
                        <article className="stat" key={k}>
                          <span>{k}</span>
                          <strong>{v}</strong>
                        </article>
                      ))}
                    </div>
                    <div className="grid two">
                      <section className="card">
                        <h2>Your practice timeline</h2>
                        <Trend data={d.trend} />
                      </section>
                      <section className="card">
                        <h2>Concept-by-concept progress</h2>
                        {cs.map((c: any) => (
                          <div className="progress-row" key={c.id}>
                            <span>{c.name}</span>
                            <div className="bar">
                              <i
                                className={state(c)}
                                style={{ width: `${c.mastery ?? 0}%` }}
                              />
                            </div>
                            <strong>{fmt(c.mastery)}</strong>
                          </div>
                        ))}
                      </section>
                      <section className="card wide">
                        <div className="card-head">
                          <h2>Recent learning</h2>
                          <button
                            className="secondary"
                            onClick={() =>
                              run(async () =>
                                download(
                                  "my-learning-data.json",
                                  await api("export"),
                                ),
                              )
                            }
                          >
                            <Download size={16} />
                            Export data
                          </button>
                        </div>
                        {d.recent.map((a: any) => (
                          <div className="activity-row" key={a.id}>
                            <span
                              className={
                                "activity-dot " +
                                (a.correct ? "strong" : "focus")
                              }
                            />
                            <div>
                              <strong>
                                {cs.find((c: any) => c.id === a.concept)?.name}
                              </strong>
                              <small>
                                {a.hint ? "Hint used" : "Independent answer"}
                              </small>
                            </div>
                            <Tag tone={a.correct ? "strong" : "focus"}>
                              {a.correct ? "Correct" : "Review"}
                            </Tag>
                            <time>
                              {new Date(a.created_at).toLocaleString()}
                            </time>
                          </div>
                        ))}
                        {!d.answers && (
                          <Empty title="Your first session starts the story" />
                        )}
                      </section>
                    </div>
                  </>
                )}
                {view === "Materials" && (
                  <Materials key={sid} sid={sid} run={run} busy={busy} />
                )}
                {view === "Subjects" && (
                  <SubjectEditor
                    key={sid}
                    subject={s}
                    run={run}
                    busy={busy}
                    onSave={async () => {
                      await refresh();
                      await loadSubjects();
                      setNotice("Subject saved");
                    }}
                    onCreate={async (id: string) => {
                      await loadSubjects();
                      setSid(id);
                    }}
                  />
                )}
                {view === "Code Lab" && <BrowserCodeLab storageKey={user.id + ":" + sid} />}
                {view === "Model Lab" && <Models key={sid} sid={sid} />}
                {view === "Settings" && (
                  <SettingsPanel
                    user={user}
                    run={run}
                    busy={busy}
                    logout={logout}
                  />
                )}
              </motion.div>
            ))}
            </>
          )}
          <footer className="page-footer">
            <span>MASTERYMAP · PERSONAL LEARNING INTELLIGENCE</span>
            <span>Your pace. Your path.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
function TutorPanel({ sid, cs, ai, run, busy }: any) {
  const [context,setContext]=useState(cs[0]?.id||""),[source,setSource]=useState<any>(null);
  const [chat, setChat] = useState<any[]>([]),
    [text, setText] = useState(""),
    [mode, setMode] = useState("Guided hints");
  useEffect(() => {
    api(`subjects/${sid}/chat`)
      .then(setChat)
      .catch(() => {});
  }, [sid]);
  const sending = useRef(false);
  const [tutorError, setTutorError] = useState("");
  const last = [...chat].reverse().find((x) => x.role === "assistant");
  const weak = cs.find((c:any) => c.id === context) || cs[0];
  return (
    <div className="grid tutor-grid">
      <section className="card tutor">
        <div className="card-head">
          <div className="tutor-title">
            <div className="tutor-mark">
              <Sparkles size={20} />
            </div>
            <div>
              <h2>Your learning partner</h2>
              <small>
                {ai ? "AI key configured" : "Reference mode · no API key"}
              </small>
            </div>
          </div>
          <Tag tone="teal">{busy ? "Working…" : "Ready"}</Tag>
        </div>
        <label>Current concept<select value={context} onChange={e=>setContext(e.target.value)}>{cs.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        {source&&<section className="studio-source"><h3>{source.source}{source.page?` · page ${source.page}`:''}</h3><pre className="studio-prompt">{source.text}</pre><button className="link" onClick={()=>setSource(null)}>Close passage</button></section>}
        <div className="messages">
          {chat.length ? (
            chat.map((m, i) => (
              <article key={i} className={"message " + m.role}>
                <small>{m.role === "user" ? "YOU" : "MASTERYMAP"}</small>
                <StudentMarkdown text={m.text} />
                {m.sources?.length > 0 && (
                  <div className="source-tags">
                    {m.sources.map((s: any, j: number) => (
                      <button className="tag" key={j} onClick={()=>setSource(s)}>[{j+1}] {s.source}{s.page?` · page ${s.page}`:""}</button>
                    ))}
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="tutor-welcome">
              <Sparkles size={36} />
              <h2>Let’s make it click.</h2>
              <p>
                Ask about a concept, unpack a mistake, or test your explanation
                against your notes.
              </p>
              {[
                `Help me understand ${weak?.name}`,
                `Quiz me on ${cs[0]?.name}`,
              ].map((t) => (
                <button
                  className="suggestion"
                  key={t}
                  onClick={() => setText(t)}
                >
                  {t}
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          )}
        </div>
        {tutorError && <p className="error" role="alert">{tutorError}</p>}
        {busy && <p role="status">Preparing your {mode.toLowerCase()}…</p>}
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            const message = text.trim();
            if (sending.current || busy || message.length < 2) return;
            sending.current = true;
            setTutorError("");
            run(async () => {
              try {
                const r = await api(`subjects/${sid}/tutor`, {
                  message,
                  mode,
                  referenceOnly: !ai,
                  concept:context,
                });
                setChat((old) => [...old, { role: "user", text: message }, { role: "assistant", ...r }]);
                setText("");
              } catch (e) {
                setTutorError((e as Error).message);
              } finally {
                sending.current = false;
              }
            });
          }}
        >
          <input
            disabled={busy}
            aria-label="Message your tutor"
            placeholder="Ask a question, or explain your thinking…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            minLength={2}
          />
          <button className="primary" aria-label="Send message" disabled={busy}>
            <Send size={19} />
          </button>
        </form>
        <small className="composer-note">
          Grounded in your subject references. Generated explanations can still
          make mistakes.
        </small>
      </section>
      <aside className="card context">
        <span className="eyebrow">LEARNER CONTEXT</span>
        <h2>A tutor with context.</h2>
        <div className="data-row">
          <span>Focus concept</span>
          <strong>{weak?.name}</strong>
        </div>
        <div className="data-row">
          <span>Mastery</span>
          <strong>{fmt(weak?.mastery)}</strong>
        </div>
        <label>
          Tutor mode
          <select disabled={busy} value={mode} onChange={(e) => {setMode(e.target.value);setTutorError("");}}>
            {["Guided hints", "Worked explanation", "Check my reasoning"].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
        </label>
        <p className="note">Mode applies to your next message. Choose Worked explanation and send your question for a direct answer.</p>
        <div className="divider" />
        <span className="eyebrow">RETRIEVED EVIDENCE</span>
        <p>{last?.retrieval || "Sources appear with your first question."}</p>
        {last?.sources?.map((s: any, i: number) => (
          <details className="source-detail" key={i}>
            <summary>
              <FileText size={15} />
              <span>
                [{i + 1}] {s.source}
              </span>
            </summary>
            <small>
              Passage {s.chunk}
              {s.page ? " · Page " + s.page : ""}
            </small>
            <p>{s.text}</p>
          </details>
        ))}
        <p className="note">{last?.citationStatus}</p>
      </aside>
    </div>
  );
}
function Reflection({ sid, cs, run, busy }: any) {
  const [concept, setConcept] = useState(cs[0]?.id),
    [text, setText] = useState(""),
    [feedback, setFeedback] = useState<any>(null);
  return (
    <section className="card">
      <span className="eyebrow">EXPLAIN IT BACK</span>
      <h2>Turn recall into understanding.</h2>
      <label>
        Concept
        <select value={concept} onChange={(e) => setConcept(e.target.value)}>
          {cs.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Your explanation
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Explain this idea in your own words…"
        />
      </label>
      <button
        className="secondary"
        disabled={busy || text.length < 20}
        onClick={() =>
          run(async () =>
            setFeedback(
              await api(`subjects/${sid}/reflect`, { concept, text }),
            ),
          )
        }
      >
        <Sparkles size={16} />
        Review my reasoning
      </button>
      {feedback && (
        <div className="feedback good">
          <StudentMarkdown text={feedback.text} />
          <small>
            {feedback.citationStatus}. AI feedback does not automatically change
            mastery.
          </small>
        </div>
      )}
      <small className="note">
        Uses your configured AI provider and subject sources.
      </small>
    </section>
  );
}
function Readiness({ bundle, sid, run, refresh, practice, plan }: any) {
  const { subject: s, learning: d, forecast: f } = bundle;
  const [prefs, setPrefs] = useState(s.preferences),
    [count, setCount] = useState(6);
  const scenario =
    d.overall == null
      ? null
      : Math.round(
          d.overall + (100 - d.overall) * (1 - Math.exp(-count * 0.035)),
        );
  return (
    <>
      <div className="grid readiness-grid">
        <section className="card readiness-hero">
          <Tag tone="teal">EXAM OUTLOOK</Tag>
          <h2>
            Know what deserves
            <br />
            your attention.
          </h2>
          <Ring value={d.overall} label="current mastery" size={175} />
          <p>
            {d.coverage}% concept coverage · {d.distinctQuestions} distinct
            questions observed
          </p>
          <label>
            Exam date
            <input
              type="date"
              value={prefs.examDate}
              onChange={(e) => setPrefs({ ...prefs, examDate: e.target.value })}
            />
          </label>
          <label>
            Total exam marks
            <input
              type="number"
              min={1}
              max={1000}
              value={prefs.totalMarks}
              onChange={(e) =>
                setPrefs({ ...prefs, totalMarks: Number(e.target.value) })
              }
            />
          </label>
          <button
            className="secondary"
            onClick={() =>
              run(async () => {
                await api(`subjects/${sid}/preferences`, prefs);
                await refresh();
              })
            }
          >
            Save exam settings
            <Check size={15} />
          </button>
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Evidence and outlook</h2>
            <Tag>
              {f.days} days {prefs.examDate ? "remaining" : "scenario"}
            </Tag>
          </div>
          <Trend data={d.trend} />
          <div className="outlook-stats">
            <div>
              <small>Decay scenario at exam</small>
              <strong>{fmt(f.projected)}</strong>
            </div>
            <div>
              <small>Observed accuracy interval</small>
              <strong>
                {f.interval ? `${f.interval[0]}–${f.interval[1]}%` : "—"}
              </strong>
            </div>
            <div>
              <small>Unassessed marks</small>
              <strong>{f.unknownMarks}</strong>
            </div>
          </div>
          <p className="note">
            {f.method}. The interval is a Wilson interval for observed
            distinct-question accuracy, not a confidence band for predicted exam
            marks.
          </p>
          <button className="primary" onClick={plan}>
            Build a revision plan
            <ArrowRight size={16} />
          </button>
        </section>
      </div>
      <div className="grid two">
        <section className="card">
          <h2>Highest-impact topics</h2>
          <p>Set relative topic weights to match your syllabus.</p>
          {f.topics.map((c: any) => (
            <div className="weighted-topic" key={c.id}>
              <button className="link" onClick={() => practice(c.id)}>
                {c.name}
                <ArrowUpRight size={14} />
              </button>
              <label>
                <span className="sr-only">{c.name} weight</span>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={prefs.weights[c.id] ?? 1}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      weights: {
                        ...prefs.weights,
                        [c.id]: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
              <span>
                {c.marksAtRisk == null
                  ? "Unassessed"
                  : `${c.marksAtRisk} marks at risk*`}
              </span>
            </div>
          ))}
          <p className="note">
            *Conditional estimate from hand-set mastery/decay assumptions and
            your weights, not a validated forecast. Save settings to
            recalculate.
          </p>
        </section>
        <section className="card scenario">
          <span className="eyebrow">EXPLORE A SCENARIO</span>
          <h2>What could practice change?</h2>
          <div className="scenario-numbers">
            <strong>{fmt(d.overall)}</strong>
            <ArrowRight />
            <strong>{fmt(scenario)}</strong>
          </div>
          <label>
            {count} practice questions
            <input
              type="range"
              min={0}
              max={30}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <p>
            This illustration assumes diminishing improvement. It helps compare
            a study effort; it does not predict your actual result.
          </p>
          <p className="note">
            Formula: current + remaining gap × (1 − exp(−0.035 × questions)).
          </p>
        </section>
      </div>
    </>
  );
}
function PlanPanel({ sid, run, busy, practice, ai }: any) {
  const [plan, setPlan] = useState<any>(null),
    [runs, setRuns] = useState<any[]>([]),
    [goal, setGoal] = useState("Prepare for my next assessment"),
    [minutes, setMinutes] = useState(45),
    [useAI, setAI] = useState(false),
    [active, setActive] = useState("");
  async function load() {
    const [p, r] = await Promise.all([
      api(`subjects/${sid}/plan`),
      api(`subjects/${sid}/runs`),
    ]);
    setPlan(p);
    setRuns(r);
  }
  useEffect(() => {
    load().catch(() => {});
  }, [sid]);
  useEffect(() => {
    if (!runs.some((r) => r.status === "running")) return;
    const t = setInterval(() => load().catch(() => {}), 1000);
    return () => clearInterval(t);
  }, [runs.some((r) => r.status === "running"), sid]);
  const trace = runs.find((x) => x.id === active) || runs[0];
  return (
    <>
      <section className="section-banner">
        <div>
          <span className="eyebrow">A DELIBERATE NEXT STEP</span>
          <h2>
            Your time.
            <br />
            Put to better use.
          </h2>
          <p>
            Inspect the evidence, review the strategy, and choose the plan that
            works for you.
          </p>
        </div>
        <CalendarDays size={70} strokeWidth={1} />
      </section>
      <div className="grid two">
        <section className="card">
          <h2>Design this session</h2>
          <label>
            Learning goal
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              maxLength={500}
            />
          </label>
          <label>
            Minutes available
            <input
              type="number"
              value={minutes}
              min={15}
              max={240}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={useAI}
              disabled={!ai}
              onChange={(e) => setAI(e.target.checked)}
            />
            Use AI planner + critic revision
          </label>
          <button
            className="primary"
            disabled={busy || runs.some((r) => r.status === "running")}
            onClick={() =>
              run(async () => {
                const r = await api(`subjects/${sid}/runs`, {
                  goal,
                  minutes,
                  useAI,
                });
                setActive(r.id);
                await load();
              })
            }
          >
            <Play size={16} />
            {plan ? "Replan from latest answers" : "Run study workflow"}
          </button>
          <p className="note">
            {useAI
              ? "The planner and critic use the configured language model."
              : "Rule mode uses evidence and prerequisite checks. Configure a key for AI planning."}{" "}
            Nothing changes your plan until you approve it.
          </p>
        </section>
        <section className="card">
          <h2>Your saved plan</h2>
          {plan ? (
            plan.items.map((x: any) => (
              <div className="plan-item" key={x.id}>
                <input
                  aria-label={`Complete ${x.title}`}
                  type="checkbox"
                  checked={x.done}
                  onChange={(e) =>
                    run(async () =>
                      setPlan(
                        await api(`subjects/${sid}/plan/complete`, {
                          task: x.id,
                          done: e.target.checked,
                        }),
                      ),
                    )
                  }
                />
                <div>
                  <strong className={x.done ? "done" : ""}>{x.title}</strong>
                  <small>
                    {x.activity} · {x.minutes} minutes
                  </small>
                  <button className="link" onClick={() => practice(x.id)}>
                    Start practice
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <Empty
              title="A little direction goes a long way"
              detail="Run the workflow and approve a proposed plan."
            />
          )}
        </section>
        <section className="card wide">
          <div className="card-head">
            <h2>Study-agent execution</h2>
            <select
              aria-label="Select workflow run"
              value={trace?.id || ""}
              onChange={(e) => setActive(e.target.value)}
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {new Date(r.created_at).toLocaleString()} · {r.status}
                </option>
              ))}
            </select>
          </div>
          {trace ? (
            <>
              <p className="workflow-mode">
                {trace.input?.useAI
                  ? "AI-assisted plan · planner and critic enabled"
                  : "Rule-based plan · AI Critic skipped"}
                {trace.status === "completed" ? " · Plan approved" : ""}
              </p>
              <div className="agent-path">
                {[
                  "Supervisor",
                  "Learner model",
                  "Planner",
                  "Critic",
                  "Retrieval",
                  "Assessment",
                  "Reviewer",
                  "Reflection",
                ].map((x) => (
                  <span
                    className={
                      trace.events.some((e: any) => e.agent === x)
                        ? "executed"
                        : ""
                    }
                    key={x}
                  >
                    {x}
                    {x === "Critic" && !trace.input?.useAI ? " · skipped" : ""}
                  </span>
                ))}
              </div>
              <Tag tone={trace.status === "failed" ? "focus" : "teal"}>
                {trace.status.replaceAll("_", " ")}
              </Tag>
              <StudyTrace
                events={trace.events}
                concepts={
                  trace.events.find((e: any) => e.agent === "Learner model")
                    ?.output?.concepts || []
                }
              />
              {trace.result?.error && <p className="error" role="alert">{trace.result.error}</p>}
              {["failed", "interrupted"].includes(trace.status) && <div className="inline-form">
                <button className="secondary" disabled={busy || runs.some(r => r.status === "running")} onClick={() => run(async () => {
                  const r = await api(`runs/${trace.id}/retry`, {}); setActive(r.id); await load();
                })}>{trace.events.some((e:any)=>e.agent === "Planner" && e.status === "complete") ? "Retry · reuse completed planner" : "Retry failed workflow"}</button>
                <button className="secondary" disabled={busy || runs.some(r => r.status === "running")} onClick={() => run(async () => {
                  const r = await api(`subjects/${sid}/runs`, {...trace.input, useAI:false}); setActive(r.id); await load();
                })}>Create a rule-based plan instead</button>
                <p className="note">A provider quota limit must reset or be resolved with your provider. Retrying does not bypass it. Rule mode makes no AI calls; all plans still require approval.</p>
              </div>}
              {trace.result?.items && (
                <div className="proposal">
                  {trace.result.items.map((x: any) => (
                    <div className="data-row" key={x.id}>
                      <span>
                        {x.title} · {x.activity}
                      </span>
                      <strong>{x.minutes} min</strong>
                    </div>
                  ))}
                </div>
              )}
              {trace.status === "awaiting_approval" && (
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      setPlan(await api(`runs/${trace.id}/approve`, {}));
                      await load();
                    })
                  }
                >
                  <ShieldCheck size={17} />
                  Approve this plan
                </button>
              )}
            </>
          ) : (
            <Empty
              title="A workflow you can inspect"
              detail="Each actual step and its output will appear here."
            />
          )}
        </section>
      </div>
    </>
  );
}
function QuizPanel({ sid, run, busy, refresh }: any) {
  const [modules,setModules]=useState<any[]>([]),[weights,setWeights]=useState<Record<string,number>>({}),[unanswered,setUnanswered]=useState(false);
  useEffect(()=>{api(`subjects/${sid}/learning-hub`).then(d=>{setModules(d.modules);setWeights(Object.fromEntries(d.modules.map((m:any)=>[m.name,1])))}).catch(()=>{})},[sid]);
  const [list, setList] = useState<any[]>([]),
    [title, setTitle] = useState("Personal checkpoint"),
    [duration, setDuration] = useState(15),
    [count, setCount] = useState(5),
    [active, setActive] = useState<any>(null),
    [answers, setAnswers] = useState<any>({}),
    [result, setResult] = useState<any>(null),
    [clock, setClock] = useState(Date.now());
  const ref = useRef(answers);
  ref.current = answers;
  const finishing = useRef(false);
  async function load() {
    setList(await api(`subjects/${sid}/quizzes`));
  }
  useEffect(() => {
    load().catch(() => {});
  }, [sid]);
  async function finish() {
    if (!active || finishing.current) return;
    finishing.current = true;
    try {
      const r = await api(`quizzes/${active.id}/submit`, {
        answers: ref.current,
        finish: true,
      });
      setResult(r.result);
      setActive(null);
      await refresh();
      await load();
    } finally {
      finishing.current = false;
    }
  }
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active?.id]);
  useEffect(() => {
    if (active && clock >= Date.parse(active.deadline) && !busy) run(finish);
  }, [clock]);
  const left = active
    ? Math.max(0, Math.ceil((Date.parse(active.deadline) - clock) / 1000))
    : 0;
  return (
    <>
      <div className="grid two">
        <section className="card">
          <span className="eyebrow">PERSONAL ASSESSMENT</span>
          <h2>Create an exam or checkpoint.</h2>
          <details><summary>Module weighting</summary><p>Relative weights guide question allocation. Zero excludes a module. Available questions may limit the allocation.</p>{modules.map(m=><label key={m.name}>{m.name}<input type="number" min={0} max={100} value={weights[m.name]??1} onChange={e=>setWeights({...weights,[m.name]:Number(e.target.value)})}/></label>)}</details>
          <label>
            Quiz name
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div className="form-grid">
            <label>
              Questions
              <input
                type="number"
                min={1}
                max={30}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </label>
            <label>
              Minutes
              <input
                type="number"
                min={1}
                max={180}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </label>
          </div>
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await api(`subjects/${sid}/quizzes`, {
                  title,
                  count,
                  duration,
                  moduleWeights:weights,
                });
                await load();
              })
            }
          >
            Create quiz
            <Plus size={16} />
          </button>
          <p className="note">
            Uses the current question bank, up to the requested number. Add or
            generate questions in Subjects.
          </p>
        </section>
        <section className="card">
          <h2>Your quiz library</h2>
          {list.map((x) => (
            <div className="topic-row" key={x.id}>
              <div>
                <strong>{x.title}</strong>
                <small>
                  {x.duration} minutes ·{" "}
                  {x.submitted_at
                    ? "Completed"
                    : x.started_at
                      ? "In progress"
                      : "Ready"}
                </small>
              </div>
              <button
                className="secondary"
                disabled={busy || !!active}
                onClick={() =>
                  run(async () => {
                    if (x.result) {
                      setResult(x.result);
                      return;
                    }
                    const r = await api(`quizzes/${x.id}/start`, {});
                    if (r.submitted) setResult(r.result);
                    else {
                      setActive(r);
                      setAnswers(r.answers);
                      setClock(Date.now());
                      setResult(null);
                    }
                  })
                }
              >
                {x.result ? `${x.result.score}% · Review` : "Start / resume"}
              </button>
            </div>
          ))}
          {!list.length && <Empty title="No checkpoints yet" />}
        </section>
      </div>
      {active && (
        <section className="card quiz-active">
          <div className="card-head">
            <h2>{active.title}</h2>
            <Tag tone="teal">
              <Clock size={14} />
              {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
            </Tag>
          </div>
          <div className="studio-options">{active.questions.map((q:any,i:number)=><button className="secondary" key={q.id} onClick={()=>{setUnanswered(false);setTimeout(()=>document.getElementById('exam-'+q.id)?.scrollIntoView({behavior:'smooth',block:'center'}),0)}}>{i+1}{answers[q.id]==null?' ○':' ✓'}</button>)}</div>
          <label><input type="checkbox" checked={unanswered} onChange={e=>setUnanswered(e.target.checked)}/> Show unanswered only ({active.questions.filter((q:any)=>answers[q.id]==null).length})</label>
          {active.questions.map((q: any, i: number) => (

            <div className="quiz-question" id={"exam-"+q.id} hidden={unanswered&&answers[q.id]!=null} key={q.id}>
              <span className="eyebrow">QUESTION {i + 1}</span>
              <h3>{q.prompt}</h3>
              {q.options.map((o: string, k: number) => (
                <label className="quiz-choice" key={k}>
                  <input
                    type="radio"
                    name={q.id}
                    disabled={busy || left === 0}
                    checked={answers[q.id] === k}
                    onChange={() =>
                      run(async () => {
                        const next = { ...ref.current, [q.id]: k };
                        const r = await api(`quizzes/${active.id}/submit`, {
                          answers: next,
                        });
                        if (r.submitted) {
                          setResult(r.result);
                          setActive(null);
                          await refresh();
                          await load();
                        } else setAnswers(next);
                      })
                    }
                  />
                  {o}
                </label>
              ))}
            </div>
          ))}
          <button
            className="primary"
            disabled={busy}
            onClick={() => run(finish)}
          >
            Submit quiz
            <Check size={16} />
          </button>
          <p className="note">
            Selections save immediately. After the deadline only previously
            saved answers count.
          </p>
        </section>
      )}
      {result && (
        <section className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow">YOUR CHECKPOINT RESULTS</span>
              <h2>Feedback that moves you forward.</h2>
            </div>
            <Ring value={result.score} label="quiz score" />
          </div>
          <p>
            {result.correct} / {result.total} correct{" "}
            {result.expired ? "· Deadline reached" : ""}
          </p>
          {result.modules&&<div className="studio-modules">{Object.entries(result.modules).map(([name,r]:[string,any])=><article className="card" key={name}><h3>{name}</h3><b>{r.correct} / {r.total} correct</b><p>{r.unanswered} unanswered</p></article>)}</div>}
          {result.feedback.map((q: any) => (
            <div className="quiz-question" key={q.id}>
              <h3>{q.prompt}</h3>
              <p>
                Your answer:{" "}
                {q.choice == null ? "Unanswered" : q.options[q.choice]}
              </p>
              <Tag tone="strong">Correct: {q.options[q.correct]}</Tag>
              <p>{q.explanation}</p>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
function Materials({ sid, run, busy }: any) {
  const [docs, setDocs] = useState<any[]>([]),
    [search, setSearch] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function load() {
    setDocs(await api(`subjects/${sid}/materials`));
  }
  useEffect(() => {
    load().catch(() => {});
  }, [sid]);
  return (
    <>
      <section className="upload-hero">
        <div>
          <span className="eyebrow">YOUR PERSONAL KNOWLEDGE LIBRARY</span>
          <h2>
            Bring your sources.
            <br />
            <em>Connect the dots.</em>
          </h2>
          <p>
            Notes, slides, textbooks and photographed pages—available to your
            tutor and study workflow.
          </p>
        </div>
        <button
          className="primary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <Upload size={17} />
          {busy ? "Reading document…" : "Add material"}
        </button>
        <input
          ref={input}
          type="file"
          hidden
          accept=".pdf,.txt,.md,.docx,.pptx,.png,.jpg,.jpeg,.webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file)
              run(async () => {
                const form = new FormData();
                form.append("file", file);
                const r = await fetch(`/api/subjects/${sid}/materials`, {
                  method: "POST",
                  body: form,
                });
                const j = await r.json();
                if (!r.ok) throw Error(j.error || "Upload failed");
                await load();
              });
            e.target.value = "";
          }}
        />
      </section>
      <div className="library-toolbar">
        <h2>{docs.length} documents</h2>
        <input
          aria-label="Search library"
          placeholder="Search your materials…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="document-grid">
        {docs
          .filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
          .map((d) => (
            <article className="card document" key={d.id}>
              <div className="card-head">
                <div className="doc-icon">
                  <FileText size={25} />
                </div>
                <Tag tone="strong">{d.status}</Tag>
              </div>
              <h3>{d.name}</h3>
              <p>
                {d.pages ? `${d.pages} pages · ` : ""}
                {d.passages} passages · {d.method}
              </p>
              <div className="source-tags">
                {d.concepts?.map((c: string) => <Tag key={c}>{c}</Tag>)}
              </div>
              <div className="document-footer">
                <small>Private to this subject</small>
                <button
                  className="icon-button"
                  aria-label={`Delete ${d.name}`}
                  onClick={() =>
                    run(async () => {
                      await api("materials/" + d.id, undefined, "DELETE");
                      await load();
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
      </div>
      {!docs.length && (
        <section className="card">
          <Empty
            title="Make your notes part of the picture"
            detail="Upload a document to use its evidence in tutoring and revision planning."
          />
        </section>
      )}
      <p className="note">
        PDF, DOCX, PPTX, TXT, Markdown and images · 8 MB per file · scanned PDF
        OCR up to 12 pages. Extracted text is retained; original files are not.
      </p>
    </>
  );
}
function SubjectEditor({ subject, run, busy, onSave, onCreate }: any) {
  const [draft, setDraft] = useState<any>(JSON.parse(JSON.stringify(subject))),
    [newName, setNewName] = useState(""),
    [topic, setTopic] = useState(subject.concepts[0]?.id),
    [proposed, setProposed] = useState<any[]>([]),
    [goal, setGoal] = useState("Create a clearer concept map from my notes");
  const patch = (i: number, k: string, v: any) =>
    setDraft({
      ...draft,
      concepts: draft.concepts.map((c: any, j: number) =>
        i === j ? { ...c, [k]: v } : c,
      ),
    });
  return (
    <>
      <section className="card">
        <div className="card-head">
          <div>
            <span className="eyebrow">YOUR CURRICULUM</span>
            <h2>Give your learning a structure.</h2>
          </div>
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await api("subjects/" + subject.id, draft, "PUT");
                await onSave();
              })
            }
          >
            Save subject
            <Check size={16} />
          </button>
        </div>
        <div className="form-grid">
          <label>
            Subject name
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            Description
            <input
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </label>
        </div>
        <div className="concept-editor">
          {draft.concepts.map((c: any, i: number) => (
            <div className="concept-edit" key={c.id}>
              <div className="card-head">
                <span className="eyebrow">CONCEPT {i + 1}</span>
                <button
                  className="icon-button"
                  aria-label={`Remove ${c.name}`}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      concepts: draft.concepts
                        .filter((x: any) => x.id !== c.id)
                        .map((x: any) => ({
                          ...x,
                          prereqs: x.prereqs.filter((p: string) => p !== c.id),
                        })),
                      questions: draft.questions.filter(
                        (q: any) => q.concept !== c.id,
                      ),
                    })
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <label>
                Name
                <input
                  value={c.name}
                  onChange={(e) => patch(i, "name", e.target.value)}
                />
              </label>
              <label>
                Reference summary
                <textarea
                  value={c.summary}
                  onChange={(e) => patch(i, "summary", e.target.value)}
                />
              </label>
              <label>Modules (comma separated)<input defaultValue={(c.modules||[]).join(", ")} onBlur={e=>patch(i,"modules",e.target.value.split(",").map(x=>x.trim()).filter(Boolean))}/></label>
              <label>Prerequisites</label>
              <div className="prereq-options">
                {draft.concepts
                  .filter((x: any) => x.id !== c.id)
                  .map((x: any) => (
                    <label className="check-label" key={x.id}>
                      <input
                        type="checkbox"
                        checked={c.prereqs.includes(x.id)}
                        onChange={(e) =>
                          patch(
                            i,
                            "prereqs",
                            e.target.checked
                              ? [...c.prereqs, x.id]
                              : c.prereqs.filter((p: string) => p !== x.id),
                          )
                        }
                      />
                      {x.name}
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <button
          className="secondary"
          onClick={() =>
            setDraft({
              ...draft,
              concepts: [
                ...draft.concepts,
                {
                  id: "topic-" + crypto.randomUUID().slice(0, 8),
                  name: "New concept",
                  summary: "",
                  prereqs: [],
                },
              ],
            })
          }
        >
          <Plus size={15} />
          Add concept
        </button>
        <p className="note">
          Cycles are rejected. A concept with recorded practice cannot be
          deleted. Save before generating questions for newly added concepts.
        </p>
      </section>
      <div className="grid two">
        <section className="card">
          <h2>A new subject, a new map.</h2>
          <label>
            Subject name
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Java, Linear Algebra, SQL"
            />
          </label>
          <button
            className="primary"
            disabled={busy || newName.length < 2}
            onClick={() =>
              run(async () => {
                const r = await api("subjects", {
                  name: newName,
                  description: "My personal learning map",
                  concepts: [
                    {
                      id: "foundations",
                      name: "Foundations",
                      summary: "",
                      prereqs: [],
                    },
                  ],
                  questions: [],
                });
                await onCreate(r.id);
              })
            }
          >
            Create subject
            <Plus size={16} />
          </button>
        </section>
        <section className="card">
          <h2>Let your notes suggest connections.</h2>
          <label>
            Graph goal
            <input value={goal} onChange={(e) => setGoal(e.target.value)} />
          </label>
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await api(`subjects/${subject.id}/graph/generate`, {
                  goal,
                });
                setDraft({
                  ...draft,
                  concepts: r.concepts,
                  questions: draft.questions.filter((q: any) =>
                    r.concepts.some((c: any) => c.id === q.concept),
                  ),
                });
              })
            }
          >
            <Sparkles size={15} />
            Propose concept graph
          </button>
          <p className="note">
            AI proposals remain editable. Inspect them, then save. Existing
            assessed concepts must be preserved.
          </p>
        </section>
      </div>
      <section className="card">
        <div className="card-head">
          <h2>Your question bank</h2>
          <Tag>{draft.questions.length} questions</Tag>
        </div>
        <div className="inline-form">
          <select
            aria-label="Question topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            {draft.concepts.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              run(async () =>
                setProposed(
                  (
                    await api(`subjects/${subject.id}/questions/generate`, {
                      concept: topic,
                      count: 5,
                    })
                  ).questions,
                ),
              )
            }
          >
            <Sparkles size={16} />
            Generate five questions
          </button>
          <button
            className="secondary"
            onClick={() =>
              setProposed([
                ...proposed,
                {
                  id: crypto.randomUUID(),
                  concept: topic,
                  prompt: "",
                  options: ["", "", "", ""],
                  correct: 0,
                  explanation: "",
                  hint: "",
                  difficulty: 2,
                  misconception: "",
                },
              ])
            }
          >
            <Plus size={16} />
            Write a question
          </button>
        </div>
        {proposed.map((q: any, i: number) => (
          <div className="question-editor" key={q.id}>
            <label>
              Question {i + 1}
              <textarea
                value={q.prompt}
                onChange={(e) =>
                  setProposed(
                    proposed.map((x, j) =>
                      i === j ? { ...x, prompt: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
            <div className="form-grid">
              {q.options.map((o: string, k: number) => (
                <label key={k}>
                  Option {String.fromCharCode(65 + k)}
                  <input
                    value={o}
                    onChange={(e) =>
                      setProposed(
                        proposed.map((x, j) =>
                          i === j
                            ? {
                                ...x,
                                options: x.options.map(
                                  (v: string, n: number) =>
                                    n === k ? e.target.value : v,
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <div className="form-grid">
              <label>
                Correct answer
                <select
                  value={q.correct}
                  onChange={(e) =>
                    setProposed(
                      proposed.map((x, j) =>
                        i === j ? { ...x, correct: Number(e.target.value) } : x,
                      ),
                    )
                  }
                >
                  {[0, 1, 2, 3].map((k) => (
                    <option key={k} value={k}>
                      {String.fromCharCode(65 + k)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Difficulty
                <select
                  value={q.difficulty}
                  onChange={(e) =>
                    setProposed(
                      proposed.map((x, j) =>
                        i === j
                          ? { ...x, difficulty: Number(e.target.value) }
                          : x,
                      ),
                    )
                  }
                >
                  {[1, 2, 3].map((k) => (
                    <option key={k} value={k}>
                      {["Easy", "Medium", "Hard"][k - 1]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Explanation
              <textarea
                value={q.explanation}
                onChange={(e) =>
                  setProposed(
                    proposed.map((x, j) =>
                      i === j ? { ...x, explanation: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
            <button
              className="link"
              onClick={() => setProposed(proposed.filter((_, j) => j !== i))}
            >
              Discard question
            </button>
          </div>
        ))}
        {proposed.length > 0 && (
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const next = {
                  ...draft,
                  questions: [...draft.questions, ...proposed],
                };
                await api("subjects/" + subject.id, next, "PUT");
                setDraft(next);
                setProposed([]);
                await onSave();
              })
            }
          >
            Approve and save questions
            <ShieldCheck size={16} />
          </button>
        )}
        <div className="bank-list">
          {draft.questions.map((q: any) => (
            <details key={q.id}>
              <summary>{q.prompt}</summary>
              <p>Answer: {q.options[q.correct]}</p>
              <p>{q.explanation}</p>
              <button
                className="link"
                onClick={() => {
                  setProposed([...proposed, q]);
                  setDraft({
                    ...draft,
                    questions: draft.questions.filter(
                      (x: any) => x.id !== q.id,
                    ),
                  });
                }}
              >
                Edit question
              </button>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
function Models({ sid }: any) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api(`subjects/${sid}/models`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [sid]);
  if (error) return <p className="error">{error}</p>;
  if (!data) return <Empty title="Loading model evidence…" />;
  if (!data.available)
    return (
      <section className="card">
        <Empty
          title="A model needs a matching vocabulary"
          detail={data.message || "Run model setup to enable inference."}
        />
      </section>
    );
  return (
    <>
      <section className="section-banner">
        <div>
          <span className="eyebrow">TRANSPARENT INTELLIGENCE</span>
          <h2>
            A prediction should
            <br />
            come with evidence.
          </h2>
          <p>
            {data.synthetic
              ? "Bundled models are trained on synthetic interactions. Their scores demonstrate the pipeline, not real-student accuracy."
              : "Operator-trained model. Inspect its dataset provenance before interpreting scores."}
          </p>
        </div>
        <Brain size={70} strokeWidth={1} />
      </section>
      {data.coverageNote&&<p className="note">{data.coverageNote}</p>}
      <div className="grid two">
        <section className="card wide">
          <h2>Next-response probability</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.predictions}>
              <CartesianGrid vertical={false} stroke="#e1e5dd" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar
                name="Classical ML"
                dataKey="ml"
                fill="#237e72"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                name="GRU sequence model"
                dataKey="dl"
                fill="#b86a43"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="note">
            Probability of a correct medium-difficulty response; not mastery, an
            exam score, or a promise.
          </p>
        </section>
        <section className="card">
          <h2>Held-out model comparison</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>AUC ↑</th>
                  <th>Brier ↓</th>
                  <th>Log loss ↓</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.report.metrics).map(([k, m]: any) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{m.auc}</td>
                    <td>{m.brier}</td>
                    <td>{m.logLoss}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <h2>The training record</h2>
          <p>{data.report.split.method}</p>
          <div className="data-row">
            <span>Selected ML</span>
            <strong>{data.report.selectedML}</strong>
          </div>
          <div className="data-row">
            <span>GRU checkpoint</span>
            <strong>Epoch {data.report.bestEpoch}</strong>
          </div>
          <button
            className="secondary"
            onClick={() => download("model-card.json", data.report)}
          >
            <Download size={16} />
            Download model card
          </button>
        </section>
      </div>
    </>
  );
}
function SettingsPanel({ user, run, busy, logout }: any) {
  const [current, setCurrent] = useState(""),
    [replacement, setReplacement] = useState(""),
    [saved, setSaved] = useState(false);
  return (
    <div className="grid two">
      <section className="card">
        <span className="eyebrow">YOUR ACCOUNT</span>
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <Tag tone="teal">Student-only workspace</Tag>
        <div className="divider" />
        <button
          className="secondary"
          onClick={() =>
            run(async () =>
              download("masterymap-my-data.json", await api("export")),
            )
          }
        >
          <Download size={16} />
          Export my learning data
        </button>
        <p className="note">
          Subjects, answers, plans and reflection feedback are private to your
          account.
        </p>
        <button className="link" onClick={() => run(logout)}>
          Sign out
          <LogOut size={16} />
        </button>
      </section>
      <section className="card">
        <h2>Change your password</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await api("auth/password", { current, replacement });
              setCurrent("");
              setReplacement("");
              setSaved(true);
            });
          }}
        >
          <label>
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </label>
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              minLength={10}
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              required
            />
          </label>
          <button className="primary" disabled={busy}>
            Update password
            <ShieldCheck size={16} />
          </button>
          {saved && (
            <p className="success">
              Password updated. Other sessions have been signed out.
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
