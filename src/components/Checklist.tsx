"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowCounterClockwise, ArrowDownRight, ArrowUpRight, Camera, CheckCircle, PencilSimple, PencilSimpleLine, Plus, Warning, XCircle } from "@phosphor-icons/react";
import { analyze, legLabel, statusOf, sw, type Bias } from "@/lib/checklist";
import { displayLabel, type Analysis } from "@/lib/analyses";
import { findStrategy, useStrategies } from "@/lib/useStrategies";
import { useAnalyses } from "@/lib/useAnalyses";
import { useStepProofs } from "@/lib/useStepProofs";
import { useTrades } from "@/lib/useTrades";
import { dayKey, fmtR, ms, rOf, taken } from "@/lib/format";
import { useProfile } from "@/lib/profile";
import Select from "@/components/Select";
import Lightbox from "@/components/Lightbox";
import VerdictPanel, { VerdictMark } from "@/components/VerdictPanel";
import { stepVerdict } from "@/lib/ai";
import { useProofProfile } from "@/lib/useProofProfile";
import { MIN_DAYS, MIN_TRADES, matchScore } from "@/lib/profileMatch";

export default function Checklist() {
  const router = useRouter();
  const { profile, instruments } = useProfile();
  const A = useAnalyses();
  const { strategies } = useStrategies();
  const { trades } = useTrades();
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); }, []);

  const a = A.active;
  const strategy = findStrategy(strategies, a?.sid ?? null);
  const steps = strategy.steps;
  const { req: REQ, nogo: NOGO } = useMemo(() => analyze(steps), [steps]);
  const proofs = useStepProofs(a?.id, A.flush);
  const PP = useProofProfile(trades);

  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<string | null | undefined>(undefined);
  const [view, setView] = useState<{ key: string; i: number } | null>(null);

  const MAX_TRADES = profile.max_trades_day, MAX_LOSS_R = profile.max_loss_r;
  const guard = useMemo(() => {
    const today = !now ? [] : (trades ?? []).filter((t) => dayKey(ms(t)) === dayKey(now) && taken(t));
    const lossR = today.reduce((s, t) => s + Math.min(0, rOf(t)), 0);
    const out: string[] = [];
    if (today.length >= MAX_TRADES) out.push(`You've hit ${today.length} trade${today.length === 1 ? "" : "s"} today. Your limit is ${MAX_TRADES}.`);
    if (-lossR >= MAX_LOSS_R) out.push(`Today's loss is ${fmtR(lossR)}, at your ${MAX_LOSS_R}R daily limit.`);
    return out;
  }, [trades, now, MAX_TRADES, MAX_LOSS_R]);

  if (!A.ready || !a) {
    return <section className="view"><h1>Pre-trade checklist</h1><div aria-busy="true"><div className="skel" /><div className="skel" /><div className="skel" /></div></section>;
  }

  const ticks = a.ticks, bias = a.bias;
  const doneReq = REQ.filter((k) => ticks[k]).length;
  const stops = NOGO.filter((k) => ticks[k]).length;
  const valid = statusOf(ticks, steps) === "valid";
  const legs = steps.filter((s) => !s.stop);
  const syncText = A.sync === "synced" ? "Synced to your account" : A.sync === "saving" ? "Saving" : A.sync === "offline" ? "Saved on this device. Will sync when you're back online." : "Loading your analyses";

  const index = analyze(steps).items;
  const slides = view ? (proofs.byKey[view.key] ?? []).filter((p) => p.url).map((p) => {
    const item = index[view.key];
    const ctx = { title: item ? sw(item.t, bias) : "Step", detail: item?.d ? sw(item.d, bias) : undefined, bias };
    return {
      url: p.url!, title: item ? sw(item.t, bias) : "Proof", caption: displayLabel(a, A.items.indexOf(a)),
      aside: <VerdictPanel row={p} aiEnabled={profile.ai_enabled} busy={proofs.checking === p.id} error={proofs.checkError} onCheck={() => proofs.check(p, ctx)} onOverride={(v) => proofs.override(p, v)} />,
    };
  }) : [];

  return (
    <section className="view">
      <h1>Pre-trade checklist</h1>
      <p className="lede">Tick every required box before you enter. Add a screenshot to any ticked step as proof. If any item under “Skip the trade” is ticked, there is no trade today.</p>

      <Strip items={A.items} active={a.id} onPick={(id) => { A.setActive(id); setRenaming(false); setConfirmDiscard(false); }} onNew={() => setAdding(true)} strategies={strategies} />

      {adding && (
        <NewAnalysis instruments={instruments} defaultBias={profile.default_bias} strategies={strategies ?? []} defaultSid={a.sid}
          onCancel={() => setAdding(false)} onStart={(o) => { A.create(o); setAdding(false); }} />
      )}

      {guard.map((m) => (
        <div className="note" role="status" key={m}><Warning size={20} weight="bold" /><span>{m} This is a warning, not a block.</span></div>
      ))}

      <div className="an-head">
        <div className="f">
          <label htmlFor="strategy">Strategy</label>
          <Select id="strategy" label="Strategy" value={strategy.id ?? ""} options={(strategies ?? [strategy]).map((s) => ({ value: s.id ?? "", label: s.name, hint: s.builtin ? "Built in" : `v${s.version}` }))}
            onChange={(v) => { const next = v || null; if (next === (a.sid ?? null)) return; if (Object.values(ticks).some(Boolean)) setPendingSwitch(next); else A.setStrategy(a.id, next); }} />
        </div>
        <div className="an-tools">
          <button className="chip" onClick={() => setRenaming((r) => !r)}><PencilSimple size={16} weight="bold" />Rename</button>
          <Link href="/strategies" className="chip" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Manage strategies</Link>
          <button className="chip" onClick={() => setConfirmDiscard(true)}>Discard</button>
        </div>
        {renaming && (
          <div className="f" style={{ marginTop: 10 }}>
            <label htmlFor="an-name">Name</label>
            <input id="an-name" type="text" value={a.label} onChange={(e) => A.rename(a.id, e.target.value)} onBlur={() => setRenaming(false)} autoFocus placeholder={`Analysis ${A.items.indexOf(a) + 1}`} />
          </div>
        )}
      </div>

      {pendingSwitch !== undefined && (
        <div className="confirm" role="alertdialog" aria-label="Switch strategy" style={{ marginBottom: 16 }}>
          <p>Switch strategy? This clears the boxes you have ticked on this analysis. Its screenshots stay.</p>
          <div className="g2">
            <button className="btn" onClick={() => { A.setStrategy(a.id, pendingSwitch); setPendingSwitch(undefined); }}>Switch</button>
            <button className="btn ghost" onClick={() => setPendingSwitch(undefined)}>Keep</button>
          </div>
        </div>
      )}
      {confirmDiscard && (
        <div className="confirm" role="alertdialog" aria-label="Discard analysis" style={{ marginBottom: 16 }}>
          <p>Discard &quot;{displayLabel(a, A.items.indexOf(a))}&quot;? Its ticks and screenshots are deleted.</p>
          <div className="g2">
            <button className="btn danger" onClick={() => { setConfirmDiscard(false); void A.remove(a.id); }}>Discard</button>
            <button className="btn ghost" onClick={() => setConfirmDiscard(false)}>Keep</button>
          </div>
        </div>
      )}

      <div className="bar">
        <div className="bar-top">
          <div className="seg" role="group" aria-label="Bias for this analysis">
            <button className="bull" aria-pressed={bias === "bull"} onClick={() => A.setBias(a.id, "bull")}>Bullish</button>
            <button className="bear" aria-pressed={bias === "bear"} onClick={() => A.setBias(a.id, "bear")}>Bearish</button>
          </div>
          <output className={"status" + (stops ? " stop" : valid ? " go" : "")} aria-live="polite">
            {stops ? "No trade" : valid ? "Setup valid" : `${doneReq} / ${REQ.length} required`}
          </output>
        </div>
        <div className="run">
          <div className={"staff" + (stops ? " void" : valid ? " closed" : "")} aria-hidden="true">
            {legs.map((st) => {
              const req = st.items.filter((i) => i[3] === 1);
              if (!req.length) return null;
              return (
                <div className="leg" style={{ flex: req.length }} key={st.id}>
                  <div className="cells">{req.map((i, ix) => <i key={i[0]} className={ticks[i[0]] ? "on" : ""} style={{ "--i": ix } as React.CSSProperties} />)}</div>
                  <span>{legLabel(st)}</span>
                </div>
              );
            })}
          </div>
          <button className="icon-btn" onClick={() => A.resetTicks(a.id)} aria-label="Reset the ticks on this analysis"><ArrowCounterClockwise size={20} weight="bold" /></button>
        </div>
      </div>

      <MatchLine PP={PP} aiEnabled={profile.ai_enabled} current={Object.fromEntries(Object.keys(index).map((k) => [k, stepVerdict(proofs.byKey[k] ?? [])]))} />

      {proofs.error && <p className="msg err" role="alert" style={{ marginTop: 14 }}>{proofs.error}</p>}

      {steps.map((st) => {
        const nonStop = st.items.filter((i) => i[3] !== 2);
        const c = nonStop.filter((i) => ticks[i[0]]).length;
        return (
          <section className={"leg-sec" + (st.stop ? " stop" : "")} key={st.id}>
            <div className="leg-head">
              <h2>{sw(st.title, bias)}</h2>
              <span className="tf">{st.tf}</span>
              <span className="count num">{st.stop ? (stops ? `${stops} ticked` : "") : `${c}/${nonStop.length}`}</span>
            </div>
            <p className="sub">{sw(st.goal, bias)}</p>
            <ul className="rows">
              {st.items.map(([k, t, d, r]) => (
                <li key={k}>
                  <label>
                    <input type="checkbox" checked={!!ticks[k]} onChange={(e) => A.setTick(a.id, k, e.target.checked)} />
                    <span className="t"><b>{sw(t, bias)}</b>{d && <small>{sw(d, bias)}</small>}</span>
                    <span className={"lvl" + (r === 1 ? " req" : "")}>{r === 1 ? "Req" : r === 0 ? "Opt" : ""}</span>
                  </label>
                  {(ticks[k] || (proofs.byKey[k]?.length ?? 0) > 0) && (
                    <ProofStrip itemKey={k} list={proofs.byKey[k] ?? []} busy={proofs.busy === k} onAdd={(files) => proofs.add(k, files)} onOpen={(i) => setView({ key: k, i })} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <div className="save">
        <button className="btn block" onClick={() => router.push(`/log/new?a=${a.id}`)}><PencilSimpleLine size={22} weight="bold" />Save trade</button>
        <p className="sub">Saves this analysis to your log, with its screenshots, and clears it. Your other analyses stay open.</p>
        <p className="sync" role="status">{syncText}</p>
      </div>

      {view && slides.length > 0 && (
        <Lightbox slides={slides} index={Math.min(view.i, slides.length - 1)} setIndex={(i) => setView({ key: view.key, i })} onClose={() => setView(null)}
          onRemove={async (i) => { const p = (proofs.byKey[view.key] ?? []).filter((x) => x.url)[i]; if (p) await proofs.remove(p); setView(null); }} />
      )}
    </section>
  );
}

/** The analyses in progress, side by side. */
function Strip({ items, active, onPick, onNew, strategies }: { items: Analysis[]; active: string; onPick: (id: string) => void; onNew: () => void; strategies: ReturnType<typeof useStrategies>["strategies"] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: "nearest", block: "nearest" }); }, [active, items.length]);
  return (
    <div className="strip" ref={ref} role="group" aria-label="Analyses in progress">
      {items.map((x, i) => {
        const st = findStrategy(strategies, x.sid).steps, an = analyze(st), done = an.req.filter((k) => x.ticks[k]).length;
        const status = statusOf(x.ticks, st);
        return (
          <button key={x.id} className="an" aria-pressed={x.id === active} onClick={() => onPick(x.id)}>
            <span className="an-name">{displayLabel(x, i)}</span>
            <span className="an-meta">
              {x.bias === "bull" ? <ArrowUpRight size={14} weight="bold" aria-label="Bullish" /> : <ArrowDownRight size={14} weight="bold" aria-label="Bearish" />}
              {status === "valid" ? <><CheckCircle size={14} weight="bold" aria-hidden="true" /><span className="sr">Setup valid</span></> : status === "no_trade" ? <><XCircle size={14} weight="bold" aria-hidden="true" /><span className="sr">No trade</span></> : <span className="mono">{done}/{an.req.length}</span>}
            </span>
          </button>
        );
      })}
      <button className="an new" onClick={onNew}><Plus size={16} weight="bold" />New</button>
    </div>
  );
}

function NewAnalysis({ instruments, defaultBias, strategies, defaultSid, onStart, onCancel }: {
  instruments: string[]; defaultBias: Bias; strategies: { id: string | null; name: string; version: number; builtin?: boolean }[]; defaultSid: string | null;
  onStart: (o: { label: string; bias: Bias; sid: string | null }) => void; onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [bias, setBias] = useState<Bias>(defaultBias);
  const [sid, setSid] = useState<string | null>(defaultSid);
  return (
    <form className="an-new" onSubmit={(e) => { e.preventDefault(); onStart({ label, bias, sid }); }}>
      <h2>New analysis</h2>
      <p className="sub">Run another setup alongside the ones you have open, for example a second market.</p>
      <div className="f" style={{ marginTop: 12 }}>
        <label htmlFor="na-inst">Instrument or name</label>
        <Select id="na-inst" label="Instrument or name" creatable placeholder="Choose or type" value={label} onChange={setLabel} options={instruments.map((i) => ({ value: i, label: i }))} />
      </div>
      <div className="f">
        <label htmlFor="na-strat">Strategy</label>
        <Select id="na-strat" label="Strategy" value={sid ?? ""} onChange={(v) => setSid(v || null)} options={strategies.map((s) => ({ value: s.id ?? "", label: s.name, hint: s.builtin ? "Built in" : `v${s.version}` }))} />
      </div>
      <div className="f">
        <span className="l">Bias</span>
        <div className="seg" role="group" aria-label="Bias">
          <button type="button" className="bull" aria-pressed={bias === "bull"} onClick={() => setBias("bull")}>Bullish</button>
          <button type="button" className="bear" aria-pressed={bias === "bear"} onClick={() => setBias("bear")}>Bearish</button>
        </div>
      </div>
      <div className="g2">
        <button className="btn" type="submit"><Plus size={20} weight="bold" />Start</button>
        <button className="btn ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function ProofStrip({ itemKey, list, busy, onAdd, onOpen }: { itemKey: string; list: { id: string; url?: string; ai_verdict?: import("@/lib/ai").Verdict | null; user_verdict?: import("@/lib/ai").Verdict | null }[]; busy: boolean; onAdd: (f: FileList) => void; onOpen: (i: number) => void }) {
  const pick = useRef<HTMLInputElement>(null);
  const shown = list.filter((p) => p.url);
  return (
    <div className="proof">
      {shown.map((p, i) => (
        <button key={p.id} className="thumb" onClick={() => onOpen(i)} aria-label={`View screenshot ${i + 1} of ${shown.length}`}><img src={p.url} alt="" /><VerdictMark row={p} /></button>
      ))}
      {busy && <span className="thumb loading" aria-label="Uploading screenshot" />}
      <button className="proof-add" onClick={() => pick.current?.click()} disabled={busy}><Camera size={18} weight="bold" />{shown.length ? "Add another" : "Add proof"}</button>
      <input ref={pick} id={`proof-${itemKey}`} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files?.length) onAdd(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

/** Profile match for the open analysis. Shows a percentage only once a month of checked trades exists. */
function MatchLine({ PP, aiEnabled, current }: { PP: ReturnType<typeof useProofProfile>; aiEnabled: boolean; current: Record<string, import("@/lib/ai").Verdict | null> }) {
  if (PP.loading || (!aiEnabled && !PP.hasProofs)) return null;
  const r = PP.readiness!;
  if (!PP.profile) {
    return (
      <div className="match" role="status">
        <b>Winning profile: not predicting yet</b>
        <p className="sub">Starts after {MIN_DAYS} days and {MIN_TRADES} checked trades. You have {Math.min(r.days, MIN_DAYS)} days and {Math.min(r.trades, MIN_TRADES)} trades so far.</p>
      </div>
    );
  }
  const pct = matchScore(PP.profile, current);
  return (
    <div className="match" role="status">
      <b>Profile match</b>
      <span className="match-pct">{pct === null ? "Not enough to compare" : pct + "%"}</span>
      <p className="sub">Share of your winning steps backed by valid proof here. Based on {PP.profile.trades} checked trades over {r.days} days. It describes your history and does not predict this trade.</p>
    </div>
  );
}
