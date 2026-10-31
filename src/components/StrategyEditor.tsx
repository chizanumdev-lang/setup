"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CaretLeft, Check, Plus, Trash } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import type { Item, Step } from "@/lib/checklist";
import { findStrategy, useStrategies } from "@/lib/useStrategies";

type EItem = { key: string; title: string; desc: string; level: 0 | 1 };
type NoGo = { key: string; title: string; desc: string };
type ESec = { id: string; title: string; tf: string; goal: string; items: EItem[] };

const uid = (p: string) => p + Math.random().toString(36).slice(2, 8);
const blankItem = (): EItem => ({ key: uid("i"), title: "", desc: "", level: 1 });
const blankSec = (): ESec => ({ id: uid("s"), title: "", tf: "", goal: "", items: [blankItem()] });

function toEditor(steps: Step[]): { secs: ESec[]; nogo: NoGo[] } {
  const secs: ESec[] = [], nogo: NoGo[] = [];
  steps.forEach((s) => {
    if (s.stop) s.items.forEach(([key, title, desc]) => nogo.push({ key, title, desc }));
    else secs.push({ id: s.id, title: s.title, tf: s.tf, goal: s.goal, items: s.items.map(([key, title, desc, level]) => ({ key, title, desc, level: level === 1 ? 1 : 0 })) });
  });
  return { secs, nogo };
}

function toSteps(secs: ESec[], nogo: NoGo[]): Step[] {
  const steps: Step[] = secs.map((s) => ({
    id: s.id, title: s.title.trim(), tf: s.tf.trim(), goal: s.goal.trim(),
    items: s.items.map((i) => [i.key, i.title.trim(), i.desc.trim(), i.level] as Item),
  }));
  if (nogo.length) {
    steps.push({ id: "x", title: "Skip the trade if…", tf: "No-go", goal: "Any one of these cancels the setup.", stop: true,
      items: nogo.map((i) => [i.key, i.title.trim(), i.desc.trim(), 2] as Item) });
  }
  return steps;
}

function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export default function StrategyEditor({ id, from }: { id?: string; from?: string | null }) {
  const router = useRouter();
  const { strategies } = useStrategies();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [secs, setSecs] = useState<ESec[]>([blankSec()]);
  const [nogo, setNogo] = useState<NoGo[]>([]);
  const [version, setVersion] = useState(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // load once the strategy list is in
  useEffect(() => {
    if (ready || strategies === null) return;
    if (id) {
      const s = strategies.find((x) => x.id === id);
      if (s) { setName(s.name); const e = toEditor(s.steps); setSecs(e.secs); setNogo(e.nogo); setVersion(s.version); }
    } else if (from !== undefined) {
      const s = findStrategy(strategies, from === "builtin" || from === null ? null : from);
      setName(`${s.name} copy`); const e = toEditor(s.steps); setSecs(e.secs); setNogo(e.nogo);
    }
    setReady(true);
  }, [strategies, ready, id, from]);

  const upSec = (i: number, patch: Partial<ESec>) => setSecs((l) => l.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const upItem = (si: number, ii: number, patch: Partial<EItem>) => setSecs((l) => l.map((s, k) => (k === si ? { ...s, items: s.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) } : s)));

  const save = async () => {
    const errs: string[] = [];
    if (!name.trim()) errs.push("Give the strategy a name.");
    if (!secs.length) errs.push("Add at least one section.");
    secs.forEach((s, i) => {
      if (!s.title.trim()) errs.push(`Section ${i + 1} needs a title.`);
      if (!s.items.length) errs.push(`Section ${i + 1} needs at least one item.`);
      s.items.forEach((it, j) => { if (!it.title.trim()) errs.push(`Section ${i + 1}, item ${j + 1} needs a title.`); });
    });
    nogo.forEach((it, j) => { if (!it.title.trim()) errs.push(`Skip list, item ${j + 1} needs a title.`); });
    if (!secs.some((s) => s.items.some((it) => it.level === 1))) errs.push("Mark at least one item as Required, so the setup can become valid.");
    setErrors(errs);
    if (errs.length) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }

    setBusy(true);
    const supabase = createClient();
    const steps = toSteps(secs, nogo);
    if (id) {
      const { error } = await supabase.from("checklists").update({ name: name.trim(), items: steps, version: version + 1 }).eq("id", id);
      if (error) { setBusy(false); setErrors([error.message]); return; }
    } else {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.replace("/login"); return; }
      const { error } = await supabase.from("checklists").insert({ user_id: u.user.id, name: name.trim(), items: steps, version: 1 });
      if (error) { setBusy(false); setErrors([error.message]); return; }
    }
    router.push("/strategies");
  };

  if (!ready) return <section className="view"><div className="skel" /><div className="skel" /></section>;
  if (id && !strategies?.some((s) => s.id === id)) {
    return <section className="view"><Link href="/strategies" className="back" style={{ textDecoration: "none", color: "inherit" }}><CaretLeft size={18} weight="bold" />Strategies</Link><h1>Not found</h1><p className="lede">This strategy doesn&apos;t exist or isn&apos;t yours.</p></section>;
  }

  return (
    <section className="view">
      <Link href="/strategies" className="back" style={{ textDecoration: "none", color: "inherit" }}><CaretLeft size={18} weight="bold" />Strategies</Link>
      <h1>{id ? "Edit strategy" : "New strategy"}</h1>
      <p className="lede">Build your own checklist: sections for each step of your process, each item Required or Optional, plus an optional list of reasons to skip the trade.</p>

      {errors.length > 0 && (
        <div className="msg err" role="alert" style={{ marginBottom: 16 }}>
          <b>Fix these first:</b>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <div className="f">
        <label htmlFor="s-name">Strategy name</label>
        <input id="s-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="London breakout" autoComplete="off" />
      </div>
      <details className="tip">
        <summary>Bullish and bearish wording</summary>
        <p>Write <code>{"{low|high}"}</code> and the first word shows for bullish, the second for bearish. For example &quot;Price sweeps the {"{low|high}"}&quot; reads &quot;low&quot; on a bullish setup and &quot;high&quot; on a bearish one.</p>
      </details>

      {secs.map((s, si) => (
        <div className="ed-sec" key={s.id}>
          <div className="ed-head">
            <h2>Section {si + 1}</h2>
            <div className="row-actions">
              <button className="icon-btn" onClick={() => setSecs((l) => move(l, si, -1))} disabled={si === 0} aria-label={`Move section ${si + 1} up`}><ArrowUp size={18} weight="bold" /></button>
              <button className="icon-btn" onClick={() => setSecs((l) => move(l, si, 1))} disabled={si === secs.length - 1} aria-label={`Move section ${si + 1} down`}><ArrowDown size={18} weight="bold" /></button>
              <button className="icon-btn" onClick={() => setSecs((l) => l.filter((_, k) => k !== si))} aria-label={`Remove section ${si + 1}`}><Trash size={18} weight="bold" /></button>
            </div>
          </div>
          <div className="g2">
            <div className="f"><label htmlFor={`st-${si}`}>Title</label><input id={`st-${si}`} type="text" value={s.title} onChange={(e) => upSec(si, { title: e.target.value })} placeholder="Daily bias" /></div>
            <div className="f"><label htmlFor={`sf-${si}`}>Timeframe (optional)</label><input id={`sf-${si}`} type="text" value={s.tf} onChange={(e) => upSec(si, { tf: e.target.value })} placeholder="1D" /></div>
          </div>
          <div className="f"><label htmlFor={`sg-${si}`}>Goal of this section (optional)</label><input id={`sg-${si}`} type="text" value={s.goal} onChange={(e) => upSec(si, { goal: e.target.value })} /></div>

          {s.items.map((it, ii) => (
            <div className="ed-item" key={it.key}>
              <div className="f"><label htmlFor={`it-${si}-${ii}`}>Item {ii + 1}</label><input id={`it-${si}-${ii}`} type="text" value={it.title} onChange={(e) => upItem(si, ii, { title: e.target.value })} placeholder="Draw on liquidity marked" /></div>
              <div className="f"><label htmlFor={`id-${si}-${ii}`}>Detail (optional)</label><textarea id={`id-${si}-${ii}`} rows={2} value={it.desc} onChange={(e) => upItem(si, ii, { desc: e.target.value })} /></div>
              <div className="ed-row">
                <div className="seg plain" role="group" aria-label={`Level for item ${ii + 1}`}>
                  <button aria-pressed={it.level === 1} onClick={() => upItem(si, ii, { level: 1 })}>Required</button>
                  <button aria-pressed={it.level === 0} onClick={() => upItem(si, ii, { level: 0 })}>Optional</button>
                </div>
                <div className="row-actions">
                  <button className="icon-btn" onClick={() => upSec(si, { items: move(s.items, ii, -1) })} disabled={ii === 0} aria-label={`Move item ${ii + 1} up`}><ArrowUp size={18} weight="bold" /></button>
                  <button className="icon-btn" onClick={() => upSec(si, { items: move(s.items, ii, 1) })} disabled={ii === s.items.length - 1} aria-label={`Move item ${ii + 1} down`}><ArrowDown size={18} weight="bold" /></button>
                  <button className="icon-btn" onClick={() => upSec(si, { items: s.items.filter((_, k) => k !== ii) })} aria-label={`Remove item ${ii + 1}`}><Trash size={18} weight="bold" /></button>
                </div>
              </div>
            </div>
          ))}
          <button className="btn ghost" onClick={() => upSec(si, { items: [...s.items, blankItem()] })}><Plus size={20} weight="bold" />Add item</button>
        </div>
      ))}
      <button className="btn ghost block" style={{ marginTop: 20 }} onClick={() => setSecs((l) => [...l, blankSec()])}><Plus size={20} weight="bold" />Add section</button>

      <div className="ed-sec stop">
        <div className="ed-head"><h2>Skip the trade if…</h2></div>
        <p className="sub">Optional. If any of these is ticked, the setup shows No trade.</p>
        {nogo.map((it, ii) => (
          <div className="ed-item" key={it.key}>
            <div className="f"><label htmlFor={`ng-${ii}`}>Reason {ii + 1}</label><input id={`ng-${ii}`} type="text" value={it.title} onChange={(e) => setNogo((l) => l.map((x, k) => (k === ii ? { ...x, title: e.target.value } : x)))} placeholder="Trade goes against the daily direction" /></div>
            <div className="f"><label htmlFor={`ngd-${ii}`}>Detail (optional)</label><textarea id={`ngd-${ii}`} rows={2} value={it.desc} onChange={(e) => setNogo((l) => l.map((x, k) => (k === ii ? { ...x, desc: e.target.value } : x)))} /></div>
            <div className="ed-row">
              <span />
              <div className="row-actions">
                <button className="icon-btn" onClick={() => setNogo((l) => move(l, ii, -1))} disabled={ii === 0} aria-label={`Move reason ${ii + 1} up`}><ArrowUp size={18} weight="bold" /></button>
                <button className="icon-btn" onClick={() => setNogo((l) => move(l, ii, 1))} disabled={ii === nogo.length - 1} aria-label={`Move reason ${ii + 1} down`}><ArrowDown size={18} weight="bold" /></button>
                <button className="icon-btn" onClick={() => setNogo((l) => l.filter((_, k) => k !== ii))} aria-label={`Remove reason ${ii + 1}`}><Trash size={18} weight="bold" /></button>
              </div>
            </div>
          </div>
        ))}
        <button className="btn ghost" onClick={() => setNogo((l) => [...l, { key: uid("n"), title: "", desc: "" }])}><Plus size={20} weight="bold" />Add reason to skip</button>
      </div>

      <div className="save">
        <button className="btn block" onClick={save} disabled={busy}><Check size={22} weight="bold" />{busy ? "Saving" : "Save strategy"}</button>
        {id && <p className="sub">Saving makes this version {version + 1}. Trades you already logged keep the version they used.</p>}
      </div>
    </section>
  );
}

