"use client";
import { useState } from "react";
import { ms, type Trade } from "@/lib/format";
import Select from "@/components/Select";

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
      <Select size="compact" label="Instrument" hideLabel value={filters.inst} onChange={(v) => setFilters({ ...filters, inst: v })}
        options={[{ value: "All", label: "All instruments" }, ...insts.map((i) => ({ value: i, label: i }))]} />
      {withOutcome && (
        <>
          <Select size="compact" label="Outcome" hideLabel value={filters.outcome} onChange={(v) => setFilters({ ...filters, outcome: v })}
            options={["All", "Win", "Loss", "Breakeven", "Skipped", "Open"].map((o) => ({ value: o, label: o === "All" ? "All outcomes" : o }))} />
        </>
      )}
    </div>
  );
}
