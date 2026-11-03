"use client";
import { useProofProfile } from "@/lib/useProofProfile";
import { useProfile } from "@/lib/profile";
import { analyze, sw, BUILTIN } from "@/lib/checklist";
import type { Trade } from "@/lib/format";
import { MIN_DAYS, MIN_TRADES } from "@/lib/profileMatch";

const pct = (v: number) => Math.round(v * 100) + "%";

/** Winning profile on the Stats screen. Says nothing predictive until a month of checked trades exists. */
export default function ProofProfile({ trades }: { trades: Trade[] }) {
  const { profile: settings } = useProfile();
  const P = useProofProfile(trades);
  if (P.loading) return null;
  if (!settings.ai_enabled && !P.hasProofs) return null;
  const r = P.readiness!;

  if (!P.profile) {
    return (
      <>
        <h2 className="block-h">Winning profile</h2>
        <div className="gate" role="status">
          <p><b>Not predicting yet.</b> The profile only starts after a month of checked trades, so it isn&apos;t built on noise.</p>
          <dl className="gate-nums">
            <div><dt>Days of checked trades</dt><dd className="mono">{Math.min(r.days, MIN_DAYS)} of {MIN_DAYS}</dd></div>
            <div><dt>Checked trades</dt><dd className="mono">{Math.min(r.trades, MIN_TRADES)} of {MIN_TRADES}</dd></div>
          </dl>
          <p className="sub">A trade counts once it is taken and has at least one step screenshot that was checked, by the AI or by you.</p>
        </div>
      </>
    );
  }

  const p = P.profile;
  const names = analyze(BUILTIN.steps).items;
  return (
    <>
      <h2 className="block-h">Winning profile</h2>
      <p className="sub">Built from {p.trades} checked trades over {r.days} days. It describes your own history. It does not predict the next trade, and with this few trades it can still be noise.</p>
      <ul className="tally" style={{ marginTop: 10 }}>
        <li><span>Every proven step</span><span className="num">{pct(p.proven.wr)} win, {p.proven.n} trades</span></li>
        <li><span>Everything else</span><span className="num">{pct(p.other.wr)} win, {p.other.n} trades</span></li>
      </ul>
      {p.steps.length === 0 ? <p className="sub" style={{ marginTop: 10 }}>No step has enough trades on both sides to compare yet.</p> : (
        <>
          <div className="legend"><span><i />Proof valid</span><span><i className="abs" />Not valid or missing</span></div>
          <ul className="impact">
            {p.steps.slice(0, 8).map((s) => {
              const lo = Math.min(s.withWR, s.withoutWR) * 100, hi = Math.max(s.withWR, s.withoutWR) * 100;
              const label = names[s.key]?.t ?? "Custom step";
              return (
                <li key={s.key}>
                  <b>{sw(label, "bull")}</b>
                  <div className="axis" role="img" aria-label={`Win rate ${pct(s.withWR)} with valid proof, ${pct(s.withoutWR)} without`}>
                    <span className="link" style={{ left: lo + "%", width: hi - lo + "%" }} />
                    <span className="pt abs" style={{ left: s.withoutWR * 100 + "%" }} />
                    <span className="pt" style={{ left: s.withWR * 100 + "%" }} />
                  </div>
                  <div className="imeta"><span>{pct(s.withWR)} vs {pct(s.withoutWR)}</span><span>{s.lift >= 0 ? "+" : "−"}{Math.abs(Math.round(s.lift * 100))} pts (n {s.nWith}/{s.nWithout})</span></div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
