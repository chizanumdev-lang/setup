"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretLeft, Check } from "@phosphor-icons/react";
import { analyze, snapshot, statusOf } from "@/lib/checklist";
import { findStrategy, useStrategies } from "@/lib/useStrategies";
import { useDraft } from "@/lib/useDraft";
import { createClient } from "@/lib/supabase/client";
import { localInput, sessionFor } from "@/lib/format";

const INSTRUMENTS = ["NQ", "ES", "BTCUSD", "EURUSD"];
const OUTCOMES = ["Open", "Win", "Loss", "Breakeven", "Skipped"] as const;

export default function EntryForm() {
  const router = useRouter();
  const { ticks, bias, sid, reset } = useDraft();
  const { strategies } = useStrategies();
  const strategy = findStrategy(strategies, sid);
  const status = statusOf(ticks, strategy.steps);
  const REQ = analyze(strategy.steps).req;
  const [f, setF] = useState({ inst: "NQ", outcome: "Open", when: "", session: "New York", type: "Reversal", entry: "", stop: "", target: "", r: "", pre: "", post: "", tags: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tz, setTz] = useState("");

  useEffect(() => {
    const now = Date.now();
    setF((p) => ({ ...p, when: localInput(now), session: sessionFor(now) }));
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);
  useEffect(() => { if (status === "no_trade") setF((p) => (p.outcome === "Open" ? { ...p, outcome: "Skipped", r: "0" } : p)); }, [status]);

  // keep R in step with outcome and prices
  const recalc = (next: typeof f) => {
    const e = +next.entry, s = +next.stop, t = +next.target;
    const planned = e && s && t && e !== s ? Math.abs(t - e) / Math.abs(e - s) : null;
    if (next.outcome === "Win" && planned) return { ...next, r: planned.toFixed(1) };
    if (next.outcome === "Loss") return { ...next, r: "-1" };
    if (next.outcome === "Breakeven" || next.outcome === "Skipped") return { ...next, r: "0" };
    return next;
  };
  const change = (k: keyof typeof f, v: string) => setF((p) => recalc({ ...p, [k]: v }));

  const num = (v: string) => (v === "" ? null : Number(v));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inst = f.inst.trim().toUpperCase();
    if (!inst) { setError("Enter an instrument."); return; }
    setBusy(true); setError("");
    const supabase = createClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { router.replace("/login"); return; }
    const row = {
      user_id: u.user.id,
      taken_at: new Date(f.when).toISOString(),
      instrument: inst,
      direction: bias,
      session: f.session,
      entry_type: f.type,
      checklist_id: strategy.id,
      checklist_version: strategy.version,
      checklist_snapshot: snapshot(strategy),
      ticks,
      status,
      entry: num(f.entry), stop: num(f.stop), target: num(f.target),
      outcome: f.outcome,
      r_result: num(f.r),
      notes_pre: f.pre.trim() || null,
      notes_post: f.post.trim() || null,
      tags: f.tags.split(",").map((s) => s.trim()).filter(Boolean),
    };
    const { data, error } = await supabase.from("trades").insert(row).select("id").single();
    if (error || !data) { setBusy(false); setError(error?.message ?? "Couldn't save. Check your connection and try again."); return; }
    try { sessionStorage.setItem("c3-undo", JSON.stringify({ id: data.id, ticks, bias })); } catch {}
    reset();
    router.push("/log");
  };

  const reqDone = REQ.filter((k) => ticks[k]).length;
  return (
    <section className="view">
      <Link href="/" className="back" style={{ textDecoration: "none", color: "inherit" }}><CaretLeft size={18} weight="bold" />Back to checklist</Link>
      <h1>Log this setup</h1>
      <p className="lede">
        {strategy.name}. {bias === "bull" ? "Bullish" : "Bearish"} setup. {status === "valid" ? "All required items ticked." : status === "no_trade" ? "A no-go item is ticked." : `${reqDone} of ${REQ.length} required items ticked.`}
      </p>
      <form onSubmit={submit} noValidate>
        <div className="g2">
          <div className="f"><label htmlFor="e-inst">Instrument</label>
            <input id="e-inst" type="text" list="inst-list" autoComplete="off" autoCapitalize="characters" value={f.inst} onChange={(e) => change("inst", e.target.value)} />
            <datalist id="inst-list">{INSTRUMENTS.map((i) => <option key={i} value={i} />)}</datalist></div>
          <div className="f"><label htmlFor="e-out">Outcome</label>
            <select id="e-out" value={f.outcome} onChange={(e) => change("outcome", e.target.value)}>{OUTCOMES.map((o) => <option key={o}>{o}</option>)}</select></div>
        </div>
        <div className="f"><label htmlFor="e-when">Date and time</label>
          <input id="e-when" type="datetime-local" value={f.when} onChange={(e) => change("when", e.target.value)} />
          <span className="h">Your timezone: {tz}. Stored as UTC.</span></div>
        <div className="g2">
          <div className="f"><label htmlFor="e-ses">Session</label>
            <select id="e-ses" value={f.session} onChange={(e) => change("session", e.target.value)}>{["Asia", "London", "New York", "Other"].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="f"><label htmlFor="e-type">Entry type</label>
            <select id="e-type" value={f.type} onChange={(e) => change("type", e.target.value)}>{["Reversal", "Continuation", "Retest", "Positional"].map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>
        <div className="g3">
          <div className="f"><label htmlFor="e-entry">Entry</label><input id="e-entry" type="number" step="any" inputMode="decimal" value={f.entry} onChange={(e) => change("entry", e.target.value)} /></div>
          <div className="f"><label htmlFor="e-stop">Stop</label><input id="e-stop" type="number" step="any" inputMode="decimal" value={f.stop} onChange={(e) => change("stop", e.target.value)} /></div>
          <div className="f"><label htmlFor="e-target">Target</label><input id="e-target" type="number" step="any" inputMode="decimal" value={f.target} onChange={(e) => change("target", e.target.value)} /></div>
        </div>
        <div className="f"><label htmlFor="e-r">Result in R</label>
          <input id="e-r" type="number" step="0.1" inputMode="decimal" value={f.r} onChange={(e) => change("r", e.target.value)} />
          <span className="h">Calculated from prices when entry, stop and target are filled. Otherwise type it.</span></div>
        <div className="f"><label htmlFor="e-pre">Notes before the trade</label><textarea id="e-pre" value={f.pre} onChange={(e) => change("pre", e.target.value)} /></div>
        <div className="f"><label htmlFor="e-post">Notes after the trade</label><textarea id="e-post" value={f.post} onChange={(e) => change("post", e.target.value)} /></div>
        <div className="f"><label htmlFor="e-tags">Tags</label>
          <input id="e-tags" type="text" placeholder="chased, news day, A+ setup" value={f.tags} onChange={(e) => change("tags", e.target.value)} />
          <span className="h">Separate with commas.</span></div>
        {error && <p className="msg err" role="alert">{error}</p>}
        <button className="btn block" type="submit" disabled={busy}><Check size={22} weight="bold" />{busy ? "Saving" : "Save to log"}</button>
      </form>
    </section>
  );
}
