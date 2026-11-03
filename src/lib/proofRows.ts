"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProofRow, Verdict } from "@/lib/ai";

const BASE = "id,path,item_key";
const AI = "ai_verdict,ai_confidence,ai_reason,ai_checked_at,user_verdict";

type Filter = { draftId: string } | { tradeId: string } | { allTrades: true };

/** Step screenshots with their AI verdicts. Falls back to the plain columns if the AI columns are not in the database yet. */
export async function fetchProofRows(supabase: SupabaseClient, f: Filter): Promise<(ProofRow & { trade_id?: string | null })[]> {
  const run = async (cols: string) => {
    // built loosely: the select string is dynamic, so the client's generic types cannot follow it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase.from("trade_images").select(cols + ",trade_id").not("item_key", "is", null);
    if ("draftId" in f) q = q.eq("draft_id", f.draftId);
    else if ("tradeId" in f) q = q.eq("trade_id", f.tradeId);
    else q = q.not("trade_id", "is", null);
    return q as Promise<{ data: unknown[] | null; error: unknown }>;
  };
  let res = await run(`${BASE},${AI}`);
  if (res.error) res = await run(BASE);
  return ((res.data ?? []) as unknown as (ProofRow & { trade_id?: string | null })[]);
}

export type Ctx = { imageId: string; title: string; detail?: string; bias: "bull" | "bear"; caption?: string };

/** Ask the server to check one screenshot. */
export async function runCheck(ctx: Ctx): Promise<{ ok: true; row: Pick<ProofRow, "ai_verdict" | "ai_confidence" | "ai_reason" | "ai_checked_at"> } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/ai/check-proof", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ctx) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: j.error ?? "The check didn't work. Try again." };
    return { ok: true, row: j };
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check your connection." };
  }
}

/** Save the trader's own call (or clear it with null). */
export async function saveOverride(supabase: SupabaseClient, id: string, v: Verdict | null): Promise<string | null> {
  const { error } = await supabase.from("trade_images").update({ user_verdict: v }).eq("id", id);
  return error ? error.message : null;
}
