"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BUILTIN, type Step, type Strategy } from "@/lib/checklist";

/** The built-in Candle Three strategy plus the user's own, newest first after the built-in. */
export function useStrategies() {
  const [custom, setCustom] = useState<Strategy[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await createClient().from("checklists").select("id,name,items,version").order("created_at", { ascending: true });
    if (error) { setError(error.message); setCustom((c) => c ?? []); return; }
    setError("");
    setCustom((data ?? []).map((r) => ({ id: r.id as string, name: r.name as string, version: r.version as number, steps: (r.items as Step[]) ?? [] })));
  }, []);

  useEffect(() => { load(); }, [load]);

  const strategies: Strategy[] | null = custom === null ? null : [BUILTIN, ...custom];
  return { strategies, custom, error, reload: load };
}

export const findStrategy = (list: Strategy[] | null, id: string | null): Strategy =>
  (list ?? []).find((s) => s.id === id) ?? BUILTIN;
