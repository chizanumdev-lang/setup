"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CaretLeft, Check } from "@phosphor-icons/react";
import { analyze, snapshot, statusOf } from "@/lib/checklist";
import { findStrategy, useStrategies } from "@/lib/useStrategies";
import { useAnalyses } from "@/lib/useAnalyses";
import { useProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { fromLocalInput, getTimeZone, localInput, sessionFor, type Trade } from "@/lib/format";
import { isOffline, queueTrade } from "@/lib/outbox";
import { uploadImages, type Pending } from "@/lib/images";
import ImagePicker from "@/components/ImagePicker";
import Select from "@/components/Select";

const OUTCOMES = ["Open", "Win", "Loss", "Breakeven", "Skipped"] as const;
type F = { inst: string; outcome: string; when: string; session: string; type: string; entry: string; stop: string; target: string; r: string; pre: string; post: string; tags: string };
const str = (v: number | null | undefined) => (v == null ? "" : String(v));

/** Log a new trade from the current setup, or edit a saved one. */
export default function TradeForm({ trade }: { trade?: Trade }) {
  const router = useRouter();
  const editing = !!trade;
  const { instruments, profile } = useProfile();
  const params = useSearchParams();
  const A = useAnalyses();
  const an = A.items.find((x) => x.id === params.get("a")) ?? A.active;
  const ticks = an?.ticks ?? {}, bias = an?.bias ?? "bull", sid = an?.sid ?? null;
  const { strategies } = useStrategies();
  const strategy = findStrategy(strategies, sid);
  const status = editing ? trade.status : statusOf(ticks, strategy.steps);
  const REQ = analyze(strategy.steps).req;

  const [f, setF] = useState<F>(() => trade ? {
    inst: trade.instrument, outcome: trade.outcome, when: localInput(new Date(trade.taken_at).getTime()), session: trade.session ?? "New York",
    type: trade.entry_type ?? "Reversal", entry: str(trade.entry), stop: str(trade.stop), target: str(trade.target), r: str(trade.r_result),
    pre: trade.notes_pre ?? "", post: trade.notes_post ?? "", tags: (trade.tags ?? []).join(", "),
  } : { inst: "", outcome: "Open", when: "", session: "New York", type: "Reversal", entry: "", stop: "", target: "", r: "", pre: "", post: "", tags: "" });
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) return;
    const now = Date.now();
    const named = an && an.label && !/^Analysis\b/i.test(an.label) ? an.label.toUpperCase() : "";
    setF((p) => ({ ...p, inst: p.inst || named || instruments[0] || "", when: localInput(now), session: sessionFor(now) }));
  }, [editing, instruments, an?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!editing && status === "no_trade") setF((p) => (p.outcome === "Open" ? { ...p, outcome: "Skipped", r: "0" } : p)); }, [status, editing]);

  // keep R in step with the outcome and prices
  const recalc = (next: F): F => {
    const e = +next.entry, s = +next.stop, t = +next.target;
    const planned = e && s && t && e !== s ? Math.abs(t - e) / Math.abs(e - s) : null;
    if (next.outcome === "Win" && planned) return { ...next, r: planned.toFixed(1) };
    if (next.outcome === "Loss") return { ...next, r: "-1" };
    if (next.outcome === "Breakeven" || next.outcome === "Skipped") return { ...next, r: "0" };
    return next;
  };
  const change = (k: keyof F, v: string) => setF((p) => recalc({ ...p, [k]: v }));
  const num = (v: string) => (v === "" ? null : Number(v));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inst = f.inst.trim().toUpperCase();
    if (!inst) { setError("Enter an instrument."); return; }
    if (!f.when) { setError("Enter the date and time."); return; }
    setBusy(true); setError("");
    const supabase = createClient();
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (!userId) { router.replace("/login"); return; }
    const fields = {
      taken_at: new Date(fromLocalInput(f.when)).toISOString(),
      instrument: inst, session: f.session, entry_type: f.type,
      entry: num(f.entry), stop: num(f.stop), target: num(f.target),
      outcome: f.outcome, r_result: num(f.r),
      notes_pre: f.pre.trim() || null, notes_post: f.post.trim() || null,
      tags: f.tags.split(",").map((s) => s.trim()).filter(Boolean),
    };

    if (editing && trade) {
      const { error } = await supabase.from("trades").update(fields).eq("id", trade.id);
      if (error) { setBusy(false); setError(error.message); return; }
      const up = await uploadImages(supabase, userId, trade.id, pending);
      if (up) { setBusy(false); setError(`Saved, but a screenshot didn't upload: ${up}`); return; }
      router.push(`/log/${trade.id}`);
      return;
    }

    if (!an) { setBusy(false); setError("There is no analysis to save. Go back to the checklist."); return; }
    const id = crypto.randomUUID();
    const row = {
      id, user_id: userId, ...fields, direction: bias,
      checklist_id: strategy.id, checklist_version: strategy.version, checklist_snapshot: snapshot(strategy), ticks, status,
    };
    const { error } = await supabase.from("trades").insert(row);
    if (error) {
      if (isOffline(error.message)) {
        let hasProof = false;
        try { hasProof = !!localStorage.getItem("c3-hasproof:" + an.id); } catch {}
        if (hasProof) { setBusy(false); setError("You're offline. This analysis has step screenshots, which can only be saved with a connection. Save it when you're back online."); return; }
        queueTrade(row);
        try { sessionStorage.setItem("c3-queued", "1"); } catch {}
        A.finish(an.id);
        router.push("/log");
        return;
      }
      setBusy(false); setError(error.message); return;
    }
    // the screenshots taken while ticking steps move from the analysis to the trade
    const moved = await supabase.from("trade_images").update({ trade_id: id, draft_id: null }).eq("draft_id", an.id);
    const up = (moved.error ? moved.error.message : null) ?? await uploadImages(supabase, userId, id, pending);
    try { sessionStorage.setItem("c3-undo", JSON.stringify({ id, analysis: an })); } catch {}
    try { localStorage.removeItem("c3-hasproof:" + an.id); } catch {}
    A.finish(an.id);
    if (up) { router.push(`/log/${id}/edit`); return; }
    router.push("/log");
  };

  const reqDone = REQ.filter((k) => ticks[k]).length;
  return (
    <section className="view">
      <Link href={editing ? `/log/${trade!.id}` : "/"} className="back" style={{ textDecoration: "none", color: "inherit" }}><CaretLeft size={18} weight="bold" />{editing ? "Back to trade" : "Back to checklist"}</Link>
      <h1>{editing ? "Edit trade" : "Log this setup"}</h1>
      {!editing && (
        <p className="lede">
          {strategy.name}. {bias === "bull" ? "Bullish" : "Bearish"} setup. {status === "valid" ? "All required items ticked." : status === "no_trade" ? "A no-go item is ticked." : `${reqDone} of ${REQ.length} required items ticked.`}
        </p>
      )}
      <form onSubmit={submit} noValidate>
        <div className="g2">
          <div className="f"><label htmlFor="e-inst">Instrument</label>
            <Select id="e-inst" label="Instrument" creatable placeholder="Choose or add" value={f.inst} onChange={(v) => change("inst", v)} options={[...new Set([...instruments, ...(f.inst ? [f.inst] : [])])].map((i) => ({ value: i, label: i }))} /></div>
          <div className="f"><label htmlFor="e-out">Outcome</label>
            <Select id="e-out" label="Outcome" value={f.outcome} onChange={(v) => change("outcome", v)} options={OUTCOMES.map((o) => ({ value: o, label: o }))} /></div>
        </div>
        <div className="f"><label htmlFor="e-when">Date and time</label>
          <input id="e-when" type="datetime-local" value={f.when} onChange={(e) => change("when", e.target.value)} />
          <span className="h">Timezone: {profile.timezone || getTimeZone()}. Stored as UTC. Change it in Settings.</span></div>
        <div className="g2">
          <div className="f"><label htmlFor="e-ses">Session</label>
            <Select id="e-ses" label="Session" value={f.session} onChange={(v) => change("session", v)} options={["Asia", "London", "New York", "Other"].map((s) => ({ value: s, label: s }))} /></div>
          <div className="f"><label htmlFor="e-type">Entry type</label>
            <Select id="e-type" label="Entry type" value={f.type} onChange={(v) => change("type", v)} options={["Reversal", "Continuation", "Retest", "Positional"].map((s) => ({ value: s, label: s }))} /></div>
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
        <ImagePicker tradeId={trade?.id} pending={pending} setPending={setPending} disabled={busy} />
        {error && <p className="msg err" role="alert">{error}</p>}
        <button className="btn block" type="submit" disabled={busy}><Check size={22} weight="bold" />{busy ? "Saving" : editing ? "Save changes" : "Save to log"}</button>
      </form>
    </section>
  );
}
