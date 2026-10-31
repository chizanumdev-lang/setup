"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowCounterClockwise, PencilSimpleLine, Warning } from "@phosphor-icons/react";
import Link from "next/link";
import { analyze, legLabel, statusOf, sw } from "@/lib/checklist";
import { findStrategy, useStrategies } from "@/lib/useStrategies";
import { useDraft } from "@/lib/useDraft";
import { useTrades } from "@/lib/useTrades";
import { dayKey, fmtR, ms, rOf, taken } from "@/lib/format";
import { useProfile } from "@/lib/profile";


export default function Checklist() {
  const router = useRouter();
  const { profile } = useProfile();
  const MAX_TRADES = profile.max_trades_day, MAX_LOSS_R = profile.max_loss_r;
  const { ticks, bias, sid, sync, setTick, setBias, reset, setStrategy } = useDraft();
  const { strategies } = useStrategies();
  const [pending, setPending] = useState<string | null | undefined>(undefined);
  const strategy = findStrategy(strategies, sid);
  const steps = strategy.steps;
  const { req: REQ, nogo: NOGO } = useMemo(() => analyze(steps), [steps]);
  const { trades } = useTrades();
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); }, []);

  const doneReq = REQ.filter((k) => ticks[k]).length;
  const stops = NOGO.filter((k) => ticks[k]).length;
  const status = statusOf(ticks, steps);
  const valid = status === "valid";

  const guard = useMemo(() => {
    const today = !now ? [] : (trades ?? []).filter((t) => dayKey(ms(t)) === dayKey(now) && taken(t));
    const lossR = today.reduce((a, t) => a + Math.min(0, rOf(t)), 0);
    const out: string[] = [];
    if (today.length >= MAX_TRADES) out.push(`You've hit ${today.length} trade${today.length === 1 ? "" : "s"} today. Your limit is ${MAX_TRADES}.`);
    if (-lossR >= MAX_LOSS_R) out.push(`Today's loss is ${fmtR(lossR)}, at your ${MAX_LOSS_R}R daily limit.`);
    return out;
  }, [trades, now, MAX_TRADES, MAX_LOSS_R]);

  const legs = steps.filter((s) => !s.stop);
  const syncText = sync === "synced" ? "Synced to your account" : sync === "saving" ? "Saving" : sync === "offline" ? "Saved on this device. Will sync when you're back online." : "Loading your draft";

  return (
    <section className="view">
      <h1>Pre-trade checklist</h1>
      <p className="lede">Tick every required box before you enter. If any item under “Skip the trade” is ticked, there is no trade today.</p>
      {guard.map((m) => (
        <div className="note" role="status" key={m}><Warning size={20} weight="bold" /><span>{m} This is a warning, not a block.</span></div>
      ))}

      <div className="strategy">
        <label htmlFor="strategy">Strategy</label>
        <select id="strategy" value={strategy.id ?? ""} onChange={(e) => {
          const next = e.target.value || null;
          if (Object.values(ticks).some(Boolean)) setPending(next); else setStrategy(next);
        }}>
          {(strategies ?? [strategy]).map((s) => <option key={s.id ?? "builtin"} value={s.id ?? ""}>{s.name}</option>)}
        </select>
        <Link href="/strategies" className="link">Manage</Link>
      </div>
      {pending !== undefined && (
        <div className="confirm" role="alertdialog" aria-label="Switch strategy" style={{ marginBottom: 16 }}>
          <p>Switch strategy? This clears the boxes you have ticked.</p>
          <div className="g2">
            <button className="btn" onClick={() => { setStrategy(pending); setPending(undefined); }}>Switch</button>
            <button className="btn ghost" onClick={() => setPending(undefined)}>Keep</button>
          </div>
        </div>
      )}
      <div className="bar">
        <div className="bar-top">
          <div className="seg" role="group" aria-label="Daily bias">
            <button className="bull" aria-pressed={bias === "bull"} onClick={() => setBias("bull")}>Bullish</button>
            <button className="bear" aria-pressed={bias === "bear"} onClick={() => setBias("bear")}>Bearish</button>
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
          <button className="icon-btn" onClick={reset} aria-label="Reset checklist"><ArrowCounterClockwise size={20} weight="bold" /></button>
        </div>
      </div>

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
                    <input type="checkbox" checked={!!ticks[k]} onChange={(e) => setTick(k, e.target.checked)} />
                    <span className="t"><b>{sw(t, bias)}</b>{d && <small>{sw(d, bias)}</small>}</span>
                    <span className={"lvl" + (r === 1 ? " req" : "")}>{r === 1 ? "Req" : r === 0 ? "Opt" : ""}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <div className="save">
        <button className="btn block" onClick={() => router.push("/log/new")}><PencilSimpleLine size={22} weight="bold" />Save trade</button>
        <p className="sub">Saves this setup to your log and clears the checklist for the next one.</p>
        <p className="sync" role="status">{syncText}</p>
      </div>
    </section>
  );
}
