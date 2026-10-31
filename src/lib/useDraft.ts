"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Bias, Ticks } from "@/lib/checklist";

const KEY = "c3-draft";
type Local = { ticks: Ticks; bias: Bias; sid: string | null; at: number; dirty: boolean };
export type SyncState = "loading" | "synced" | "offline" | "saving";

const readLocal = (): Local | null => {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
};
const writeLocal = (v: Local) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };

/** The in-progress setup. Local-first so it works offline, mirrored to Supabase so it follows you across devices. */
export function useDraft() {
  const supabase = useRef(createClient()).current;
  const [ticks, setTicksState] = useState<Ticks>({});
  const [bias, setBiasState] = useState<Bias>("bull");
  const [sid, setSidState] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncState>("loading");
  const state = useRef<Local>({ ticks: {}, bias: "bull", sid: null, at: 0, dirty: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uid = useRef<string | null>(null);

  const apply = (l: Local) => { state.current = l; setTicksState(l.ticks); setBiasState(l.bias); setSidState(l.sid ?? null); };

  const push = useCallback(async () => {
    timer.current = null;
    if (!uid.current) return;
    const cur = state.current;
    if (!cur.dirty) return;
    setSync("saving");
    const { error } = await supabase.from("drafts").upsert({
      user_id: uid.current, bias: cur.bias, ticks: cur.ticks, checklist_id: cur.sid, updated_at: new Date(cur.at).toISOString(),
    });
    if (error) { setSync("offline"); return; }
    state.current = { ...state.current, dirty: cur.at === state.current.at ? false : true };
    writeLocal(state.current);
    setSync("synced");
  }, [supabase]);

  const pull = useCallback(async () => {
    if (!uid.current) return;
    const cur = state.current;
    if (cur.dirty) { await push(); return; }
    const { data, error } = await supabase.from("drafts").select("bias,ticks,checklist_id,updated_at").eq("user_id", uid.current).maybeSingle();
    if (error) { setSync("offline"); return; }
    if (data) {
      const at = new Date(data.updated_at).getTime();
      if (at > cur.at) { const l = { ticks: data.ticks as Ticks, bias: data.bias as Bias, sid: (data.checklist_id as string | null) ?? null, at, dirty: false }; apply(l); writeLocal(l); }
    }
    setSync("synced");
  }, [supabase, push]);

  useEffect(() => {
    const local = readLocal();
    if (local) apply(local);
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      uid.current = data.user?.id ?? null;
      if (!uid.current) { setSync("offline"); return; }
      pull();
    });
    const onFocus = () => { if (document.visibilityState === "visible") pull(); };
    const onOnline = () => pull();
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
    };
  }, [supabase, pull]);

  const commit = (patch: Partial<Local>) => {
    const next = { ...state.current, ...patch, at: Date.now(), dirty: true };
    apply(next);
    writeLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(push, 600);
  };

  return {
    ticks, bias, sid, sync,
    setTick: (k: string, v: boolean) => commit({ ticks: { ...state.current.ticks, [k]: v } }),
    setBias: (b: Bias) => commit({ bias: b }),
    reset: () => commit({ ticks: {} }),
    replace: (t: Ticks, b: Bias, id?: string | null) => commit({ ticks: t, bias: b, ...(id !== undefined ? { sid: id } : {}) }),
    setStrategy: (id: string | null) => commit({ sid: id, ticks: {} }),
  };
}
