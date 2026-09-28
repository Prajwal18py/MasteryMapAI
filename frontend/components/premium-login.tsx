"use client";

import { useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Compass, Eye, EyeOff, LockKeyhole, Mail, Network, Pause, Play, Sparkles, UserRound } from "lucide-react";
import styles from "./premium-login.module.css";

type Props = { onLogin: (user: any) => void; authenticate: (path: string, data: any) => Promise<any> };

export default function PremiumLogin({ onLogin, authenticate }: Props) {
  const [create, setCreate] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);
  const pending = useRef(false);

  return (
    <main className={`${styles.page} ${paused ? styles.paused : ""}`}>
      <section className={styles.story} aria-label="Welcome to MasteryMap">
        <div className={styles.grain} aria-hidden="true" />
        <header className={styles.brand}>
          <span className={styles.brandIcon}><Compass size={25} strokeWidth={1.6} /></span>
          <span>mastery<span className={styles.brandLight}>map</span><sup>AI</sup></span>
          <span className={styles.edition}>THE LEARNING STUDIO</span>
        </header>

        <div className={styles.editorial}>
          <div className={styles.kicker}><span /> A LITTLE CURIOSITY. LIMITLESS POSSIBILITY.</div>
          <h1>Your next<br />breakthrough,<br /><em>beautifully mapped.</em></h1>
          <p>Connect what you know.<br />Discover what you’re capable of.</p>
        </div>

        <div className={styles.scene} aria-hidden="true">
          <div className={styles.halo} />
          <div className={styles.backFrame} />
          <div className={styles.mapCard}>
            <div className={styles.mapHeader}><span><Network size={16} /> YOUR KNOWLEDGE, CONNECTED</span><span className={styles.preview}>PREVIEW</span></div>
            <svg className={styles.graph} viewBox="0 0 560 255" fill="none">
              <defs>
                <linearGradient id="login-path" x1="70" y1="80" x2="480" y2="220" gradientUnits="userSpaceOnUse"><stop stopColor="#99c7b1" /><stop offset="1" stopColor="#d7ab7d" /></linearGradient>
              </defs>
              <g stroke="url(#login-path)" strokeWidth="1.4" opacity=".55">
                <path d="M86 135 C150 135 130 62 220 62 S310 115 350 115 S425 52 478 52" />
                <path d="M86 135 C150 135 145 210 230 210 S288 115 350 115 S415 205 477 205" />
                <path d="M220 62 C230 105 245 145 230 210" strokeDasharray="4 6" />
              </g>
              <path className={styles.signal} d="M86 135 C150 135 130 62 220 62 S310 115 350 115 S425 52 478 52" stroke="#dbedc3" strokeWidth="2.4" strokeDasharray="14 480" />
              <circle className={styles.pulse} cx="350" cy="115" r="35" stroke="#d7eabf" opacity=".3" />
              {[[86,135],[220,62],[230,210],[478,52],[477,205]].map(([x,y],i) => <g key={i}><circle cx={x} cy={y} r="14" fill="#234c40" stroke="#78a78d" /><circle cx={x} cy={y} r="4" fill="#b6d0ad" /></g>)}
              <circle cx="350" cy="115" r="23" fill="#d6e8be" /><path d="m341 115 6 6 12-13" stroke="#244538" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <g fill="#cad7ca" fontSize="11" fontFamily="Manrope, sans-serif"><text x="86" y="171" textAnchor="middle">Functions</text><text x="220" y="33" textAnchor="middle">Higher-order functions</text><text x="230" y="244" textAnchor="middle">Generators</text><text x="350" y="160" textAnchor="middle" fill="#e6edce">Closures</text><text x="478" y="85" textAnchor="middle">Decorators</text><text x="477" y="239" textAnchor="middle">Your next step</text></g>
            </svg>
            <div className={styles.mapFooter}><span><i /> Understanding takes shape.</span><span>01 — 03</span></div>
          </div>
          <div className={styles.insight}><span className={styles.spark}><Sparkles size={17} /></span><div><span>THE NEXT CONNECTION</span><strong>Small steps. Deeper understanding.</strong></div><ArrowUpRight size={18} /></div>
          <div className={styles.note}><span><Check size={13} /></span> A clearer path forward</div>
        </div>

        <footer className={styles.storyFooter}><span>BUILT FOR THE WAY YOU LEARN.</span><button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Resume decorative animation" : "Pause decorative animation"}>{paused ? <Play size={13} /> : <Pause size={13} />}<span>{paused ? "Resume motion" : "Pause motion"}</span></button></footer>
      </section>

      <section className={styles.entry} aria-label={create ? "Create account" : "Sign in"}>
        <div className={styles.entryTop}><span>YOUR PERSONAL WORKSPACE</span><span className={styles.smallCompass}><Compass size={18} /></span></div>
        <div className={styles.formWrap}>
          <div className={styles.welcomeIcon}><ArrowUpRight size={27} strokeWidth={1.4} /></div>
          <div className={styles.eyebrow}>A NEW CHAPTER STARTS HERE</div>
          <h2>{create ? <>Make room for<br />your potential.</> : <>Good to have<br />you back.</>}</h2>
          <p className={styles.intro}>{create ? "A space for your subjects, your questions, and everything you’re becoming." : "Pick up where curiosity left off. Your learning space is ready for you."}</p>
          <div className={styles.modeSwitch} aria-label="Account options">
            <button type="button" aria-pressed={!create} disabled={busy} className={!create ? styles.active : ""} onClick={() => { setCreate(false); setError(""); }}>Sign in</button>
            <button type="button" aria-pressed={create} disabled={busy} className={create ? styles.active : ""} onClick={() => { setCreate(true); setError(""); }}>Create account</button>
          </div>
          <form className={styles.form} onSubmit={async (e) => {
            e.preventDefault();
            if (pending.current) return;
            pending.current = true; setBusy(true); setError("");
            try { const user = await authenticate("auth/" + (create ? "register" : "login"), { email: email.trim(), name: name.trim(), password }); onLogin(user); }
            catch (err) { setError(err instanceof Error ? err.message : "Unable to connect. Please try again."); }
            finally { pending.current = false; setBusy(false); }
          }} aria-busy={busy}>
            {create && <label htmlFor="mm-name">Your name<div className={styles.field}><UserRound size={17} /><input id="mm-name" name="name" required maxLength={80} autoComplete="name" placeholder="What should we call you?" value={name} disabled={busy} onChange={e => setName(e.target.value)} /></div></label>}
            <label htmlFor="mm-email">Email address<div className={styles.field}><Mail size={17} /><input id="mm-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} disabled={busy} onChange={e => setEmail(e.target.value)} /></div></label>
            <label htmlFor="mm-password">Password<div className={styles.field}><LockKeyhole size={17} /><input id="mm-password" name="password" type={show ? "text" : "password"} required minLength={create ? 10 : undefined} autoComplete={create ? "new-password" : "current-password"} placeholder={create ? "Create a strong password" : "Enter your password"} value={password} disabled={busy} onChange={e => setPassword(e.target.value)} aria-describedby={create ? "mm-password-help" : undefined} /><button type="button" className={styles.reveal} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow(!show)}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {create && <span id="mm-password-help" className={styles.helper}>Use at least 10 characters.</span>}
            {error && <div role="alert" className={styles.error}>{error}</div>}
            <button className={styles.submit} type="submit" disabled={busy}><span>{busy ? "Opening your workspace…" : create ? "Begin your journey" : "Enter your workspace"}</span>{busy ? <span className={styles.spinner} aria-hidden="true" /> : <ArrowRight size={19} />}</button>
          </form>
          <div className={styles.privateNote}><LockKeyhole size={13} /><span>Your subjects. Your progress. Your space.</span></div>
          <div className={styles.features}><span><Network size={14} /> Map your knowledge</span><span><Sparkles size={14} /> Find your next step</span></div>
        </div>
        <footer className={styles.entryFooter}><span>Less guessing. More growing.</span><span>MASTERYMAP AI</span></footer>
      </section>
    </main>
  );
}
