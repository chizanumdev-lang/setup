"use client";
import { useState } from "react";
import { GLOSS, TIPS, sw, type Bias } from "@/lib/checklist";
import TermChart from "@/components/TermChart";

export default function Terms() {
  const [bias, setBias] = useState<Bias>("bull");
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <section className="view">
      <h1>Terms</h1>
      <p className="lede">Plain-language definitions, each with a candlestick chart of the pattern. The prices are generated to explain the idea, not taken from a real market, and the charts flip with the bias you pick.</p>
      <div className="seg" role="group" aria-label="Bias for examples">
        <button className="bull" aria-pressed={bias === "bull"} onClick={() => setBias("bull")}>Bullish</button>
        <button className="bear" aria-pressed={bias === "bear"} onClick={() => setBias("bear")}>Bearish</button>
      </div>
      <div className="fold" style={{ marginTop: 22 }}>
        {GLOSS.map(([t, p], i) => (
          <details key={t} onToggle={(e) => { const o = e.currentTarget.open; setOpen((m) => (m[i] === o ? m : { ...m, [i]: o })); }}>
            <summary>{t}</summary>
            <p>{sw(p, bias)}</p>
            {open[i] && <TermChart index={i} bias={bias} />}
          </details>
        ))}
      </div>
      <div className="fold">
        <h2>Beyond the video</h2>
        <p className="sub" style={{ marginTop: 6 }}>General trading habits added to the model. They are not part of the video.</p>
        {TIPS.map(([t, p]) => <details key={t}><summary>{t}</summary><p>{p}</p></details>)}
      </div>
    </section>
  );
}
