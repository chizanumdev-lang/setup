"use client";
import { useState } from "react";
import { ms, type Trade } from "@/lib/format";

export type FilterState = { range: "30" | "90" | "all"; inst: string; outcome: string };
export const useFilters = () => useState<FilterState>({ range: "all", inst: "All", outcome: "All" });

export function applyFilters(trades: Trade[], f: FilterState) {
  const cut = f.range === "all" ? 0 : Date.now() - Number(f.range) * 864e5;
  return trades.filter((t) => ms(t) >= cut && (f.inst === "All" || t.instrument === f.inst) && (f.outcome === "All" || t.outcome === f.outcome));
}

export function Filters({ filters, setFilters, insts, withOutcome }: { filters: FilterState; setFilters: (f: FilterState) => void; insts: string[]; withOutcome?: boolean }) {
  const ranges: [FilterState["range"], string][] = [["30", "30 days"], ["90", "90 days"], ["all", "All time"]];
  return (
    <div className="filters">
      {ranges.map(([v, l]) => <button key={v} className="chip" aria-pressed={filters.range === v} onClick={() => setFilters({ ...filters, range: v })}>{l}</button>)}
      <label className="sr" htmlFor="f-inst">Instrument</label>
      <select id="f-inst" value={filters.inst} onChange={(e) => setFilters({ ...filters, inst: e.target.value })}>
        <option value="All">All instruments</option>
        {insts.map((i) => <option key={i} value={i}>{i}</option>)}
      </select>
      {withOutcome && (
        <>
          <label className="sr" htmlFor="f-out">Outcome</label>
          <select id="f-out" value={filters.outcome} onChange={(e) => setFilters({ ...filters, outcome: e.target.value })}>
            {["All", "Win", "Loss", "Breakeven", "Skipped", "Open"].map((o) => <option key={o} value={o}>{o === "All" ? "All outcomes" : o}</option>)}
          </select>
        </>
      )}
    </div>
  );
}
