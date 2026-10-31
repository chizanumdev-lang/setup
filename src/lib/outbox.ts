"use client";
import type { SupabaseClient } from "@supabase/supabase-js";

// Trades saved while offline wait here and are sent when the connection is back.
const KEY = "c3-outbox";
type Row = Record<string, unknown> & { id: string };

const read = (): Row[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const write = (r: Row[]) => { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch {} };

export const pendingCount = () => read().length;
export const queueTrade = (row: Row) => write([...read().filter((r) => r.id !== row.id), row]);

/** True when an error looks like a lost connection rather than a rejected request. */
export const isOffline = (message?: string) =>
  (typeof navigator !== "undefined" && !navigator.onLine) || /failed to fetch|network|load failed|fetch failed/i.test(message ?? "");

/** Send queued trades. Safe to repeat: each row keeps its own id, so a retry cannot create a duplicate. */
export async function flushOutbox(supabase: SupabaseClient): Promise<number> {
  const rows = read();
  if (!rows.length) return 0;
  const { error } = await supabase.from("trades").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  if (error) return 0;
  write([]);
  return rows.length;
}
