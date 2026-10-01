"use client";
import { useEffect, useRef, useState } from "react";

type IdentityAPI = {
  initialize: (options: { client_id: string; nonce: string; callback: (value: { credential: string }) => void; auto_select: boolean }) => void;
  renderButton: (element: HTMLElement, options: Record<string, string | number>) => void;
};
const identity = () => (window as Window & { google?: { accounts?: { id?: IdentityAPI } } }).google?.accounts?.id;
let scriptReady: Promise<void> | undefined;
function loadGoogle() {
  if (identity()) return Promise.resolve();
  if (scriptReady) return scriptReady;
  scriptReady = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    const timer = window.setTimeout(() => { script.remove(); reject(new Error("Google sign-in took too long to load. Reload or use email.")); }, 15000);
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error("Google sign-in could not load. Check your connection or use email.")); };
    document.head.appendChild(script);
  }).catch(error => { scriptReady = undefined; throw error; });
  return scriptReady;
}

export default function GoogleSignIn({ onLogin, disabled = false }: { onLogin: (user: any) => void; disabled?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const onLoginRef = useRef(onLogin);
  onLoginRef.current = onLogin;
  const pending = useRef(false);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);

  async function submit(token: string, linkPassword?: string) {
    if (pending.current || disabledRef.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/google", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential: token, ...(linkPassword !== undefined ? {link_password: linkPassword} : {}) }) });
      const data = await res.json();
      if (res.status === 409 && linkPassword === undefined) { setCredential(token); setError(data.error); return; }
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to sign in with Google.");
      setCredential(""); setPassword(""); onLoginRef.current(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to sign in with Google."); }
    finally { pending.current = false; setBusy(false); }
  }

  useEffect(() => {
    let active = true;
    // Defer so React development Strict Mode does not mint two racing challenges.
    const start = window.setTimeout(() => {
      (async () => {
        const res = await fetch("/api/auth/google/config", { credentials: "same-origin", cache: "no-store" });
        const config = await res.json();
        if (!active) return;
        if (!res.ok) throw new Error(config.error || "Google sign-in is unavailable.");
        if (!config.enabled) return;
        setEnabled(true);
        await loadGoogle();
        if (!active || !host.current) return;
        const api = identity();
        if (!api) throw new Error("Google sign-in is unavailable in this browser.");
        api.initialize({ client_id: config.clientId, nonce: config.nonce, auto_select: false, callback: value => { if (active) void submit(value.credential); } });
        api.renderButton(host.current, { theme: "outline", size: "large", shape: "pill", text: "continue_with", width: Math.max(200, Math.min(400, host.current.clientWidth || 320)) });
        setReady(true);
      })().catch(e => { if (active) setError(e instanceof Error ? e.message : "Google sign-in is unavailable."); });
    }, 0);
    return () => { active = false; clearTimeout(start); };
  }, []);

  return <div style={{ margin: enabled || error ? "12px 0" : 0 }}>
    <div ref={host} aria-label="Continue with Google" style={{ minHeight: enabled ? 44 : 0, display: "flex", justifyContent: "center", pointerEvents: busy || disabled ? "none" : "auto", opacity: busy || disabled ? .6 : 1 }} />
    {enabled && !ready && !error && <p role="status" style={{fontSize:12}}>Loading Google sign-in…</p>}
    {busy && <p role="status" style={{fontSize:12}}>Verifying your Google account…</p>}
    {error && <p role="alert" style={{fontSize:12, color:"#983e35", margin:"8px 0"}}>{error}</p>}
    {credential && <form onSubmit={e => { e.preventDefault(); void submit(credential, password); }} style={{display:"grid",gap:8}}>
      <label style={{fontSize:12}}>Existing MasteryMap password
        <input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy || disabled} style={{display:"block",width:"100%",padding:10,border:"1px solid #d6ded2",borderRadius:10}} />
      </label>
      <button type="submit" disabled={busy || disabled} style={{padding:10,borderRadius:10,background:"#214c3d",color:"white",border:0}}>Link Google and sign in</button>
      <button type="button" disabled={busy} onClick={()=>{setCredential("");setPassword("");setError("");}}>Cancel linking</button>
    </form>}
    {enabled && <div style={{display:"flex",alignItems:"center",gap:12,marginTop:12,color:"#667365",fontSize:11}}><span style={{flex:1,height:1,background:"#dde2d7"}}/>or continue with email<span style={{flex:1,height:1,background:"#dde2d7"}}/></div>}
  </div>;
}
