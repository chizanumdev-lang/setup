"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTrades } from "@/lib/useTrades";
import { cls, fmtR, ms, rOf, taken, type Trade } from "@/lib/format";
import { ITEMS, sw } from "@/lib/checklist";
import { Filters, applyFilters, useFilters } from "@/components/Filters";

function agg(list: Trade[]) {
  const tk = list.filter(taken);
  const n = tk.length;
  const w = tk.filter((t) => t.outcome === "Win");
  const l = tk.filter((t) => t.outcome === "Loss");
  const tot = tk.reduce((a, t) => a + rOf(t), 0);
  const aw = w.length ? w.reduce((a, t) => a + rOf(t), 0) / w.length : 0;
  const al = l.length ? Math.abs(l.reduce((a, t) => a + rOf(t), 0) / l.length) : 0;
  return { n, wins: w.length, wr: n ? w.length / n : 0, avg: n ? tot / n : 0, tot, exp: n ? (w.length / n) * aw - (l.length / n) * al : 0 };
}
const pct = (v: number) => Math.round(v * 100) + "%";

type Dim = "session" | "weekday" | "direction" | "entry_type" | "instrument";
const DIMS: [Dim, string][] = [["session", "Session"], ["weekday", "Weekday"], ["direction", "Direction"], ["entry_type", "Entry type"], ["instrument", "Instrument"]];

export default function Stats() {
  const router = useRouter();
  const { trades } = useTrades();
  const [filters, setFilters] = useFilters();
  const [dim, setDim] = useState<Dim>("session");
  const insts = useMemo(() => [...new Set((trades ?? []).map((t) => t.instrument))], [trades]);
  const list = useMemo(() => applyFilters(trades ?? [], filters), [trades, filters]);
  const tk = list.filter(taken);
  const a = agg(list);

  return (
    <section className="view">
      <h1>Stats</h1>
      <Filters filters={filters} setFilters={setFilters} insts={insts} />
      {trades === null ? (
        <div aria-busy="true"><div className="skel" /><div className="skel" /></div>
      ) : tk.length < 3 ? (
        <div className="empty">
          <p>{trades.length ? "Not enough taken trades for these filters yet. Stats appear after three." : "Stats appear once you have logged a few trades."}</p>
          <button className="btn" onClick={() => router.push("/")}>Open checklist</button>
        </div>
      ) : (
        <Body tk={tk} a={a} skipped={list.filter((t) => t.outcome === "Skipped").length} dim={dim} setDim={setDim} />
      )}
    </section>
  );
}

function Body({ tk, a, skipped, dim, setDim }: { tk: Trade[]; a: ReturnType<typeof agg>; skipped: number; dim: Dim; setDim: (d: Dim) => void }) {
  const chrono = [...tk].sort((x, y) => ms(x) - ms(y));
  let streak = 0, kind = "";
  for (let i = chrono.length - 1; i >= 0; i--) {
    const o = chrono[i].outcome;
    if (o === "Breakeven") continue;
    if (!kind) kind = o;
    if (o === kind) streak++; else break;
  }
  const best = Math.max(...tk.map(rOf)), worst = Math.min(...tk.map(rOf));
  return (
    <>
      <ul className="tally">
        <li><span>Trades taken</span><span className="num">{a.n}</span></li>
        <li><span>Skipped</span><span className="num">{skipped}</span></li>
        <li><span>Win rate</span><span className="num">{pct(a.wr)}</span></li>
        <li><span>Average R</span><span className={"num " + cls(a.avg)}>{fmtR(a.avg)}</span></li>
        <li><span>Total R</span><span className={"num " + cls(a.tot)}>{fmtR(a.tot)}</span></li>
        <li><span>Expectancy per trade</span><span className={"num " + cls(a.exp)}>{fmtR(a.exp)}</span></li>
        <li><span>Largest win and loss</span><span className="num"><span className="pos">{fmtR(best)}</span> / <span className="neg">{fmtR(worst)}</span></span></li>
        <li><span>Current streak</span><span className="num">{streak} {kind === "Win" ? "wins" : "losses"}</span></li>
      </ul>
      <h2 className="block-h">Equity curve in R</h2>
      <Equity chrono={chrono} />
      <h2 className="block-h">Breakdown</h2>
      <div className="filters">{DIMS.map(([k, l]) => <button key={k} className="chip" aria-pressed={dim === k} onClick={() => setDim(k)}>{l}</button>)}</div>
      <Breakdown tk={tk} dim={dim} />
      <h2 className="block-h">Checklist compliance</h2>
      <Compliance tk={tk} />
      <h2 className="block-h">Item impact</h2>
      <p className="sub">Win rate when each item was ticked against when it was not. A long gap means the item matters. Items need at least three trades each way.</p>
      <Impact tk={tk} />
    </>
  );
}

function Equity({ chrono }: { chrono: Trade[] }) {
  const W = 340, H = 160, P = 26;
  const pts = chrono.reduce((a, t) => [...a, a[a.length - 1] + rOf(t)], [0]);
  const s = pts[pts.length - 1];
  const lo = Math.min(0, ...pts), hi = Math.max(0, ...pts), rng = hi - lo || 1;
  const x = (i: number) => P + ((W - P - 8) * i) / (pts.length - 1);
  const y = (v: number) => 8 + (H - 24) * (1 - (v - lo) / rng);
  const d = pts.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Equity curve, ending at ${fmtR(s)}`}>
      <line className="zero" x1={P} x2={W - 8} y1={y(0)} y2={y(0)} />
      <text x="0" y={y(0) + 4}>0</text><text x="0" y={y(hi) + 4}>{hi.toFixed(0)}</text><text x="0" y={y(lo) + 4}>{lo.toFixed(0)}</text>
      <path className="ln" d={d} /><circle className="dot" cx={x(pts.length - 1)} cy={y(s)} r="5" />
    </svg>
  );
}

function Breakdown({ tk, dim }: { tk: Trade[]; dim: Dim }) {
  const key = (t: Trade): string =>
    dim === "weekday" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(ms(t)).getDay()]
      : dim === "direction" ? (t.direction === "bull" ? "Long" : "Short")
      : String(t[dim] ?? "None");
  const g: Record<string, Trade[]> = {};
  tk.forEach((t) => (g[key(t)] = g[key(t)] || []).push(t));
  const order = dim === "weekday" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : Object.keys(g).sort();
  return (
    <table className="tbl">
      <thead><tr><th>Group</th><th>Trades</th><th>Win</th><th>Total</th></tr></thead>
      <tbody>{order.filter((k) => g[k]).map((k) => { const x = agg(g[k]); return <tr key={k}><td>{k}</td><td>{x.n}</td><td>{pct(x.wr)}</td><td className={cls(x.tot)}>{fmtR(x.tot)}</td></tr>; })}</tbody>
    </table>
  );
}

function Compliance({ tk }: { tk: Trade[] }) {
  const A = agg(tk.filter((t) => t.status === "valid")), B = agg(tk.filter((t) => t.status !== "valid"));
  return (
    <table className="tbl">
      <thead><tr><th>Setup</th><th>Trades</th><th>Win</th><th>Avg R</th></tr></thead>
      <tbody>
        <tr><td>All required ticked</td><td>{A.n}</td><td>{pct(A.wr)}</td><td className={cls(A.avg)}>{fmtR(A.avg)}</td></tr>
        <tr><td>Taken without</td><td>{B.n}</td><td>{pct(B.wr)}</td><td className={cls(B.avg)}>{fmtR(B.avg)}</td></tr>
      </tbody>
    </table>
  );
}

function Impact({ tk }: { tk: Trade[] }) {
  const rows = Object.keys(ITEMS).filter((k) => ITEMS[k].r !== 2).map((k) => {
    const yes = tk.filter((t) => t.ticks[k]), no = tk.filter((t) => !t.ticks[k]);
    if (yes.length < 3 || no.length < 3) return null;
    const A = agg(yes), B = agg(no);
    return { k, A, B, d: A.wr - B.wr };
  }).filter((r): r is NonNullable<typeof r> => !!r).sort((x, y) => y.d - x.d);
  if (!rows.length) return <p className="sub">Not enough variation yet.</p>;
  return (
    <>
      <div className="legend"><span><i />Ticked</span><span><i className="abs" />Not ticked</span></div>
      <ul className="impact">
        {rows.map(({ k, A, B }) => {
          const lo = Math.min(A.wr, B.wr) * 100, hi = Math.max(A.wr, B.wr) * 100;
          return (
            <li key={k}>
              <b>{sw(ITEMS[k].t, "bull")}</b>
              <div className="axis" role="img" aria-label={`Win rate ${pct(A.wr)} when ticked, ${pct(B.wr)} when not`}>
                <span className="link" style={{ left: lo + "%", width: hi - lo + "%" }} />
                <span className="pt abs" style={{ left: B.wr * 100 + "%" }} />
                <span className="pt" style={{ left: A.wr * 100 + "%" }} />
              </div>
              <div className="imeta"><span>{pct(A.wr)} vs {pct(B.wr)}</span><span>{fmtR(A.avg)} vs {fmtR(B.avg)} (n {A.n}/{B.n})</span></div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
