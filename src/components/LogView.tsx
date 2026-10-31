"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { useTrades } from "@/lib/useTrades";
import { useDraft } from "@/lib/useDraft";
import { cls, dayKey, fmtDay, fmtR, fmtTime, ms, rOf, taken, type Trade } from "@/lib/format";
import { Filters, applyFilters, useFilters } from "@/components/Filters";
import type { Bias, Ticks } from "@/lib/checklist";

export const StatusPill = ({ s }: { s: Trade["status"] }) =>
  s === "valid" ? <span className="pill valid">Valid</span> : s === "no_trade" ? <span className="pill no">No trade</span> : <span className="pill inc">Incomplete</span>;

export default function LogView() {
  const router = useRouter();
  const { trades, error, reload } = useTrades();
  const { replace } = useDraft();
  const [filters, setFilters] = useFilters();
  const [mode, setMode] = useState<"list" | "cal">("list");
  const [undo, setUndo] = useState<{ id: string; ticks: Ticks; bias: Bias } | null>(null);
  const [cal, setCal] = useState({ y: 2026, m: 0 });
  useEffect(() => { const n = new Date(); setCal({ y: n.getFullYear(), m: n.getMonth() }); }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("c3-undo");
      if (raw) { setUndo(JSON.parse(raw)); sessionStorage.removeItem("c3-undo"); }
    } catch {}
  }, []);
  useEffect(() => { if (!undo) return; const t = setTimeout(() => setUndo(null), 7000); return () => clearTimeout(t); }, [undo]);

  const doUndo = async () => {
    if (!undo) return;
    await createClient().from("trades").delete().eq("id", undo.id);
    replace(undo.ticks, undo.bias);
    setUndo(null);
    router.push("/");
  };

  const list = useMemo(() => applyFilters(trades ?? [], filters), [trades, filters]);
  const insts = useMemo(() => [...new Set((trades ?? []).map((t) => t.instrument))], [trades]);

  return (
    <section className="view">
      <h1>Trade log</h1>
      <Filters filters={filters} setFilters={setFilters} insts={insts} withOutcome />
      <div className="seg plain" role="group" aria-label="Log view" style={{ marginBottom: 16 }}>
        <button aria-pressed={mode === "list"} onClick={() => setMode("list")}>List</button>
        <button aria-pressed={mode === "cal"} onClick={() => setMode("cal")}>Calendar</button>
      </div>
      {error && <p className="msg err" role="alert">Couldn&apos;t load trades: {error} <button className="chip" onClick={reload}>Retry</button></p>}
      {trades === null ? (
        <div aria-busy="true"><div className="skel" /><div className="skel" /><div className="skel" /></div>
      ) : trades.length === 0 ? (
        <div className="empty"><p>No trades logged yet. Tick a setup on Check, then save it. Skipped trades count too.</p>
          <button className="btn" onClick={() => router.push("/")}>Open checklist</button></div>
      ) : list.length === 0 ? (
        <div className="empty"><p>No trades match these filters.</p>
          <button className="btn ghost" onClick={() => setFilters({ range: "all", inst: "All", outcome: "All" })}>Clear filters</button></div>
      ) : mode === "list" ? (
        <List list={list} onOpen={(id) => router.push(`/log/${id}`)} />
      ) : (
        <Calendar list={list} cal={cal} setCal={setCal} />
      )}
      {undo && (
        <div className="toast" role="status"><span>Trade saved. Checklist cleared.</span><button type="button" onClick={doUndo}>Undo</button></div>
      )}
    </section>
  );
}

function List({ list, onOpen }: { list: Trade[]; onOpen: (id: string) => void }) {
  const groups: { k: string; ts: number; items: Trade[] }[] = [];
  list.forEach((t) => {
    const k = dayKey(ms(t));
    const g = groups[groups.length - 1];
    if (!g || g.k !== k) groups.push({ k, ts: ms(t), items: [t] }); else g.items.push(t);
  });
  return (
    <>
      {groups.map((g) => {
        const sum = g.items.filter(taken).reduce((a, t) => a + rOf(t), 0);
        return (
          <div className="day" key={g.k}>
            <h3><span>{fmtDay(g.ts)}</span><span className={"num " + cls(sum)}>{fmtR(sum)}</span></h3>
            {g.items.map((t) => (
              <button className="trade" key={t.id} onClick={() => onOpen(t.id)}>
                <span className="tm">{fmtTime(ms(t))}</span>
                <span>
                  <span className="i">{t.instrument} {t.direction === "bull" ? <ArrowUpRight size={16} weight="bold" className="bullc" /> : <ArrowDownRight size={16} weight="bold" className="bearc" />}<span className="sr">{t.direction === "bull" ? "Bullish" : "Bearish"}</span></span>
                  <span className="m"><StatusPill s={t.status} />{t.session}, {t.entry_type}</span>
                </span>
                <span className={"r " + cls(rOf(t))}>{taken(t) ? fmtR(rOf(t)) : "-"}<span className="o">{t.outcome}</span></span>
              </button>
            ))}
          </div>
        );
      })}
    </>
  );
}

function Calendar({ list, cal, setCal }: { list: Trade[]; cal: { y: number; m: number }; setCal: (c: { y: number; m: number }) => void }) {
  const map: Record<string, number> = {};
  const skipped: Record<string, boolean> = {};
  list.forEach((t) => {
    const k = dayKey(ms(t));
    if (taken(t)) map[k] = (map[k] || 0) + rOf(t);
    else if (t.outcome === "Skipped") skipped[k] = true;
  });
  const pre = `${cal.y}-${String(cal.m + 1).padStart(2, "0")}`;
  const first = new Date(cal.y, cal.m, 1);
  const days = new Date(cal.y, cal.m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const [todayK, setTodayK] = useState("");
  useEffect(() => { setTodayK(dayKey(Date.now())); }, []);
  const maxAbs = Math.max(1, ...Object.entries(map).filter(([k]) => k.startsWith(pre)).map(([, v]) => Math.abs(v)));
  const label = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(first);
  const step = (d: number) => { let m = cal.m + d, y = cal.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } setCal({ y, m }); };
  return (
    <>
      <div className="cal-head">
        <button className="icon-btn" onClick={() => step(-1)} aria-label="Previous month"><CaretLeft size={20} weight="bold" /></button>
        <h2>{label}</h2>
        <button className="icon-btn" onClick={() => step(1)} aria-label="Next month"><CaretRight size={20} weight="bold" /></button>
      </div>
      <div className="cal">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div className="dow" key={d}>{d}</div>)}
        {Array.from({ length: lead }, (_, i) => <div className="d out" key={"o" + i} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1;
          const k = `${pre}-${String(d).padStart(2, "0")}`;
          const v = map[k];
          const c = v === undefined ? "" : v > 0 ? "p" : v < 0 ? "n" : "";
          return (
            <div key={k} className={`d ${c}${k === todayK ? " today" : ""}`} style={{ "--k": v ? Math.min(1, Math.abs(v) / maxAbs) : 0 } as React.CSSProperties}
              aria-label={k + (v !== undefined ? ", " + fmtR(v) : skipped[k] ? ", skipped" : "")}>
              <b>{d}</b><span className={"v " + cls(v || 0)}>{v !== undefined ? fmtR(v).replace("R", "") : skipped[k] ? "skip" : ""}</span>
            </div>
          );
        })}
      </div>
      <p className="sub" style={{ marginTop: 12 }}>Each day shows total R. Green is a net win, red a net loss.</p>
    </>
  );
}
