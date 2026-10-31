"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setTimeZone } from "@/lib/format";
import type { Bias } from "@/lib/checklist";

export type Theme = "system" | "light" | "dark";
export type Profile = { timezone: string; default_bias: Bias; max_trades_day: number; max_loss_r: number; theme: Theme };
type Ctx = {
  profile: Profile;
  instruments: string[];
  ready: boolean;
  update: (patch: Partial<Profile>) => Promise<string | null>;
  addInstrument: (symbol: string) => Promise<string | null>;
  removeInstrument: (symbol: string) => Promise<string | null>;
};

const DEFAULT_INSTRUMENTS = ["NQ", "ES", "BTCUSD", "EURUSD"];
const CACHE = "c3-profile";
const browserTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const DEFAULTS: Profile = { timezone: "", default_bias: "bull", max_trades_day: 2, max_loss_r: 2, theme: "system" };

const ProfileCtx = createContext<Ctx | null>(null);
export const useProfile = () => {
  const c = useContext(ProfileCtx);
  if (!c) throw new Error("useProfile must be used inside ProfileProvider");
  return c;
};

function applyTheme(t: Theme) {
  try {
    if (t === "system") { localStorage.removeItem("c3-theme"); document.documentElement.removeAttribute("data-theme"); }
    else { localStorage.setItem("c3-theme", t); document.documentElement.setAttribute("data-theme", t); }
  } catch {}
}

/** Loads the signed-in user's settings once and shares them. Cached locally so the app opens offline. */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile>(DEFAULTS);
  const [instruments, setInstruments] = useState<string[]>(DEFAULT_INSTRUMENTS);
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  const apply = useCallback((p: Profile, inst: string[]) => {
    setTimeZone(p.timezone || undefined);
    applyTheme(p.theme);
    setProfile(p);
    setInstruments(inst);
  }, []);

  useEffect(() => {
    // show cached settings straight away
    try {
      const raw = localStorage.getItem(CACHE);
      if (raw) { const c = JSON.parse(raw); apply({ ...DEFAULTS, ...c.profile }, c.instruments ?? DEFAULT_INSTRUMENTS); setReady(true); }
    } catch {}
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!alive) return;
      if (!u.user) { setReady(true); return; }
      setUid(u.user.id);
      const [{ data: row }, { data: inst }] = await Promise.all([
        supabase.from("profiles").select("timezone,default_bias,max_trades_day,max_loss_r,theme").eq("id", u.user.id).maybeSingle(),
        supabase.from("instruments").select("symbol").order("symbol"),
      ]);
      if (!alive) return;
      let tz = (row?.timezone as string | undefined) ?? "";
      // a new account has the database default "UTC": start from the browser's timezone instead
      if (!row || tz === "UTC" || tz === "") {
        tz = browserTz();
        await supabase.from("profiles").upsert({ id: u.user.id, timezone: tz });
      }
      let symbols = (inst ?? []).map((r) => r.symbol as string);
      if (symbols.length === 0) {
        await supabase.from("instruments").upsert(DEFAULT_INSTRUMENTS.map((symbol) => ({ user_id: u.user!.id, symbol })), { onConflict: "user_id,symbol", ignoreDuplicates: true });
        symbols = DEFAULT_INSTRUMENTS;
      }
      const p: Profile = {
        timezone: tz,
        default_bias: (row?.default_bias as Bias) ?? "bull",
        max_trades_day: Number(row?.max_trades_day ?? 2),
        max_loss_r: Number(row?.max_loss_r ?? 2),
        theme: (row?.theme as Theme) ?? "system",
      };
      apply(p, symbols);
      try { localStorage.setItem(CACHE, JSON.stringify({ profile: p, instruments: symbols })); } catch {}
      setReady(true);
    })();
    return () => { alive = false; };
  }, [supabase, apply]);

  const persist = (p: Profile, inst: string[]) => { try { localStorage.setItem(CACHE, JSON.stringify({ profile: p, instruments: inst })); } catch {} };

  const update = useCallback(async (patch: Partial<Profile>) => {
    const next = { ...profile, ...patch };
    apply(next, instruments);
    persist(next, instruments);
    if (!uid) return null;
    const { error } = await supabase.from("profiles").update(patch).eq("id", uid);
    return error ? error.message : null;
  }, [profile, instruments, uid, supabase, apply]);

  const addInstrument = useCallback(async (raw: string) => {
    const symbol = raw.trim().toUpperCase();
    if (!symbol) return "Enter a symbol.";
    if (instruments.includes(symbol)) return "That instrument is already in your list.";
    const next = [...instruments, symbol].sort();
    setInstruments(next); persist(profile, next);
    if (!uid) return null;
    const { error } = await supabase.from("instruments").insert({ user_id: uid, symbol });
    return error ? error.message : null;
  }, [instruments, profile, uid, supabase]);

  const removeInstrument = useCallback(async (symbol: string) => {
    const next = instruments.filter((s) => s !== symbol);
    setInstruments(next); persist(profile, next);
    if (!uid) return null;
    const { error } = await supabase.from("instruments").delete().eq("user_id", uid).eq("symbol", symbol);
    return error ? error.message : null;
  }, [instruments, profile, uid, supabase]);

  const value = useMemo(() => ({ profile, instruments, ready, update, addInstrument, removeInstrument }), [profile, instruments, ready, update, addInstrument, removeInstrument]);
  if (!ready) return <div className="page" aria-busy="true"><div className="skel" style={{ marginTop: 80 }} /></div>;
  return <ProfileCtx.Provider value={value}>{children}</ProfileCtx.Provider>;
}
