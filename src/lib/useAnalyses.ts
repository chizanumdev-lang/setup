"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Bias, Ticks } from "@/lib/checklist";
import { useProfile } from "@/lib/profile";
import { mergeAnalyses, nextLabel, type Analysis, type ServerDraft } from "@/lib/analyses";

const KEY = "c3-analyses";
export type SyncState = "loading" | "synced" | "offline" | "saving";
type Store = { items: Analysis[]; active: string | null; deleted: string[] };

const read = (): Store => {
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && Array.isArray(s.items)) return { items: s.items, active: s.active ?? null, deleted: s.deleted ?? [] }; } catch {}
  return { items: [], active: null, deleted: [] };
};
const write = (s: Store) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };

/** Every analysis in progress. Local first so it works offline, mirrored to Supabase so it follows you across devices. */
export function useAnalyses() {
  const supabase = useMemo(() => createClient(), []);
  const { profile } = useProfile();
  const defaultBias = useRef<Bias>(profile.default_bias);
  defaultBias.current = profile.default_bias;

  const store = useRef<Store>({ items: [], active: null, deleted: [] });
  const [, bump] = useState(0);
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState<SyncState>("loading");
  const uid = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const booted = useRef(false);

  const commit = useCallback((s: Store) => { store.current = s; write(s); bump((n) => n + 1); }, []);

  const flush = useCallback(async (): Promise<string | null> => {
    timer.current = null;
    if (!uid.current) return "Sign in again to sync.";
    const s = store.current;
    const dirty = s.items.filter((a) => a.dirty || !a.synced);
    if (!dirty.length && !s.deleted.length) return null;
    setSync("saving");
    if (s.deleted.length) {
      const { error } = await supabase.from("drafts").delete().in("id", s.deleted);
      if (error) { setSync("offline"); return error.message; }
    }
    if (dirty.length) {
      const { error } = await supabase.from("drafts").upsert(dirty.map((a) => ({
        id: a.id, user_id: uid.current, label: a.label, bias: a.bias, ticks: a.ticks, checklist_id: a.sid,
        updated_at: new Date(a.at).toISOString(), created_at: new Date(a.created).toISOString(),
      })));
      if (error) { setSync("offline"); return error.message; }
    }
    const now = store.current;
    const sent = new Map(dirty.map((a) => [a.id, a.at]));
    commit({ ...now, deleted: now.deleted.filter((id) => !s.deleted.includes(id)),
      items: now.items.map((a) => (sent.has(a.id) ? { ...a, synced: true, dirty: a.at === sent.get(a.id) ? false : a.dirty } : a)) });
    setSync("synced");
    return null;
  }, [supabase, commit]);

  const schedule = useCallback(() => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => { void flush(); }, 600); }, [flush]);

  const create = useCallback((opts: { label?: string; bias?: Bias; sid?: string | null; id?: string } = {}): string => {
    const s = store.current;
    const a: Analysis = { id: opts.id ?? crypto.randomUUID(), label: opts.label?.trim() ?? nextLabel(s.items), bias: opts.bias ?? defaultBias.current, sid: opts.sid ?? null, ticks: {}, at: Date.now(), created: Date.now(), synced: false, dirty: true };
    commit({ ...s, items: [...s.items, a], active: a.id });
    schedule();
    return a.id;
  }, [commit, schedule]);

  const pull = useCallback(async () => {
    if (!uid.current) return;
    const { data, error } = await supabase.from("drafts").select("id,label,bias,ticks,checklist_id,updated_at,created_at");
    if (error) { setSync("offline"); return; }
    const s = store.current;
    const items = mergeAnalyses(s.items, (data ?? []) as ServerDraft[], s.deleted);
    const active = items.some((a) => a.id === s.active) ? s.active : items[0]?.id ?? null;
    commit({ ...s, items, active });
    if (s.items.some((a) => a.dirty || !a.synced) || s.deleted.length) await flush(); else setSync("synced");
    if (!booted.current) {
      booted.current = true;
      if (store.current.items.length === 0) create();   // nothing anywhere: start one so you can tick straight away
    }
  }, [supabase, commit, flush, create]);

  useEffect(() => {
    commit(read());
    setReady(true);
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      uid.current = data.user?.id ?? null;
      if (!uid.current) { setSync("offline"); return; }
      void pull();
    });
    const again = () => { if (document.visibilityState === "visible") void pull(); };
    document.addEventListener("visibilitychange", again);
    window.addEventListener("online", again);
    window.addEventListener("focus", again);
    return () => { alive = false; document.removeEventListener("visibilitychange", again); window.removeEventListener("online", again); window.removeEventListener("focus", again); };
  }, [supabase, commit, pull]);

  const patch = useCallback((id: string, p: Partial<Analysis>) => {
    const s = store.current;
    commit({ ...s, items: s.items.map((a) => (a.id === id ? { ...a, ...p, at: Date.now(), dirty: true } : a)) });
    schedule();
  }, [commit, schedule]);

  const remove = useCallback(async (id: string) => {
    // delete the stored proof screenshots first, then the row (its image rows cascade)
    try {
      const { data } = await supabase.from("trade_images").select("path").eq("draft_id", id);
      if (data?.length) await supabase.storage.from("trade-images").remove(data.map((d) => d.path as string));
    } catch {}
    const s = store.current;
    const items = s.items.filter((a) => a.id !== id);
    commit({ items, active: s.active === id ? items[items.length - 1]?.id ?? null : s.active, deleted: [...s.deleted, id] });
    if (items.length === 0) create();
    schedule();
  }, [supabase, commit, create, schedule]);

  const items = store.current.items;
  const active = items.find((a) => a.id === store.current.active) ?? items[0] ?? null;

  return {
    items, active, ready, sync,
    setActive: (id: string) => commit({ ...store.current, active: id }),
    create, remove, flush,
    rename: (id: string, label: string) => patch(id, { label }),
    setTick: (id: string, k: string, v: boolean) => { const a = store.current.items.find((x) => x.id === id); if (a) patch(id, { ticks: { ...a.ticks, [k]: v } }); },
    setBias: (id: string, bias: Bias) => patch(id, { bias }),
    setStrategy: (id: string, sid: string | null) => patch(id, { sid, ticks: {} }),
    resetTicks: (id: string) => patch(id, { ticks: {} as Ticks }),
    /** Put an analysis back (undo after saving a trade). Resolves once it has reached the server. */
    restore: async (a: Analysis) => {
      const s = store.current;
      commit({ ...s, items: [...s.items.filter((x) => x.id !== a.id), { ...a, synced: false, dirty: true, at: Date.now() }], active: a.id, deleted: s.deleted.filter((d) => d !== a.id) });
      return flush();
    },
    /** Take an analysis out without touching its screenshots (they move to the saved trade). */
    finish: (id: string) => {
      const s = store.current;
      const items = s.items.filter((a) => a.id !== id);
      commit({ items, active: s.active === id ? items[items.length - 1]?.id ?? null : s.active, deleted: [...s.deleted, id] });
      if (items.length === 0) create();
      schedule();
    },
    /** Change every analysis that uses a deleted strategy back to the built-in one. */
    dropStrategy: (sid: string) => {
      const s = store.current;
      commit({ ...s, items: s.items.map((a) => (a.sid === sid ? { ...a, sid: null, ticks: {}, at: Date.now(), dirty: true } : a)) });
      schedule();
    },
  };
}
