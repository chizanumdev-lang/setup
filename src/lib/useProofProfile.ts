"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { stepVerdict, type ProofRow } from "@/lib/ai";
import { fetchProofRows } from "@/lib/proofRows";
import { buildProfile, readiness, type TradeProof } from "@/lib/profileMatch";
import type { Trade } from "@/lib/format";

/** The winning profile built from checked screenshots. `ready` stays false until a month of checked trades exists. */
export function useProofProfile(trades: Trade[] | null) {
  const [rows, setRows] = useState<(ProofRow & { trade_id?: string | null })[] | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); }, []);
  useEffect(() => {
    let alive = true;
    fetchProofRows(createClient(), { allTrades: true }).then((r) => { if (alive) setRows(r); });
    return () => { alive = false; };
  }, []);

  return useMemo(() => {
    if (!trades || !rows || !now) return { loading: true as const, items: [] as TradeProof[], readiness: null, profile: null, hasProofs: false };
    const byTrade = new Map<string, ProofRow[]>();
    rows.forEach((r) => { if (r.trade_id) byTrade.set(r.trade_id, [...(byTrade.get(r.trade_id) ?? []), r]); });
    const items: TradeProof[] = trades.map((t) => {
      const mine = byTrade.get(t.id) ?? [];
      const keys = [...new Set(mine.map((r) => r.item_key))];
      return { takenAt: new Date(t.taken_at).getTime(), outcome: t.outcome, steps: Object.fromEntries(keys.map((k) => [k, stepVerdict(mine.filter((r) => r.item_key === k))])) };
    });
    const r = readiness(items, now);
    return { loading: false as const, items, readiness: r, profile: r.ready ? buildProfile(items) : null, hasProofs: rows.length > 0 };
  }, [trades, rows, now]);
}
