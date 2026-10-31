"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trade } from "@/lib/format";
import { flushOutbox, pendingCount } from "@/lib/outbox";

export function useTrades() {
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(0);

  const load = useCallback(async () => {
    const supabase = createClient();
    await flushOutbox(supabase);
    setWaiting(pendingCount());
    const { data, error } = await supabase.from("trades").select("*").order("taken_at", { ascending: false });
    if (error) { setError(error.message); setTrades((t) => t ?? []); return; }
    setError("");
    setTrades(data as Trade[]);
  }, []);

  useEffect(() => {
    load();
    const on = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", on);
    window.addEventListener("online", load);
    return () => { document.removeEventListener("visibilitychange", on); window.removeEventListener("online", load); };
  }, [load]);

  return { trades, error, waiting, reload: load };
}
