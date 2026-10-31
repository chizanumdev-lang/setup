"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trade } from "@/lib/format";

export function useTrades() {
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await createClient().from("trades").select("*").order("taken_at", { ascending: false });
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

  return { trades, error, reload: load };
}
