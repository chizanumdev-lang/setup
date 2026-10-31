"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DownloadSimple, Plus, UploadSimple, Warning, X } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { useProfile, type Theme } from "@/lib/profile";
import { buildExport, parseImport, toCsv } from "@/lib/importer";
import type { Trade } from "@/lib/format";
import type { Bias } from "@/lib/checklist";

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SettingsView() {
  const router = useRouter();
  const { profile, instruments, update, addInstrument, removeInstrument } = useProfile();
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [newInst, setNewInst] = useState("");
  const [trades, setTrades] = useState(String(profile.max_trades_day));
  const [loss, setLoss] = useState(String(profile.max_loss_r));
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const zones = useMemo(() => {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
    const cur = profile.timezone;
    return list.includes(cur) || !cur ? list : [cur, ...list];
  }, [profile.timezone]);
  useEffect(() => { setTrades(String(profile.max_trades_day)); setLoss(String(profile.max_loss_r)); }, [profile.max_trades_day, profile.max_loss_r]);

  const save = async (patch: Parameters<typeof update>[0]) => {
    const err = await update(patch);
    setNote(err ? { kind: "err", text: err } : { kind: "ok", text: "Saved." });
  };

  const allTrades = async (): Promise<Trade[]> => {
    const { data, error } = await createClient().from("trades").select("*").order("taken_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Trade[];
  };

  const exportFile = async (kind: "json" | "csv") => {
    setBusy(true); setNote(null);
    try {
      const t = await allTrades();
      const stamp = new Date().toISOString().slice(0, 10);
      if (kind === "csv") download(`candle-three-trades-${stamp}.csv`, toCsv(t), "text/csv");
      else {
        const { data } = await createClient().from("checklists").select("id,name,version,items");
        download(`candle-three-export-${stamp}.json`, JSON.stringify(buildExport(t, (data ?? []) as never), null, 2), "application/json");
      }
      setNote({ kind: "ok", text: `Exported ${t.length} trade${t.length === 1 ? "" : "s"}. Screenshots are not included.` });
    } catch (e) { setNote({ kind: "err", text: e instanceof Error ? e.message : "Export failed." }); }
    setBusy(false);
  };

  const importFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true); setNote(null);
    try {
      const supabase = createClient();
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.replace("/login"); return; }
      const parsed = parseImport(await f.text(), u.user.id);
      if (parsed.error) { setNote({ kind: "err", text: parsed.error }); setBusy(false); return; }

      // bring over strategies the account doesn't have yet (matched by name)
      const { data: have } = await supabase.from("checklists").select("id,name");
      const byName = new Map((have ?? []).map((c) => [c.name as string, c.id as string]));
      const idMap = new Map<string, string>();
      for (const s of parsed.strategies) {
        const existing = byName.get(s.name);
        if (existing) { idMap.set(s.id, existing); continue; }
        const { data: made } = await supabase.from("checklists").insert({ user_id: u.user.id, name: s.name, items: s.items, version: s.version ?? 1 }).select("id").single();
        if (made) { idMap.set(s.id, made.id as string); byName.set(s.name, made.id as string); }
      }

      let added = 0;
      for (let i = 0; i < parsed.rows.length; i += 200) {
        const chunk = parsed.rows.slice(i, i + 200).map((r) => ({ ...r, checklist_id: null }));
        const { data, error } = await supabase.from("trades").upsert(chunk, { onConflict: "id", ignoreDuplicates: true }).select("id");
        if (error) throw new Error(error.message);
        added += data?.length ?? 0;
      }
      const dup = parsed.rows.length - added;
      setNote({ kind: "ok", text: `Imported ${added} trade${added === 1 ? "" : "s"}.${dup ? ` ${dup} already existed.` : ""}${parsed.skipped ? ` ${parsed.skipped} had missing or invalid fields and were skipped.` : ""}` });
    } catch (e) { setNote({ kind: "err", text: e instanceof Error ? e.message : "Import failed." }); }
    if (file.current) file.current.value = "";
    setBusy(false);
  };

  const deleteAccount = async () => {
    setDeleting(true); setNote(null);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setNote({ kind: "err", text: j.error ?? "Couldn't delete the account. Try again." });
      setDeleting(false);
      return;
    }
    try { localStorage.clear(); } catch {}
    await createClient().auth.signOut();
    window.location.href = "/login";
  };

  const num = (v: string, min: number) => { const n = Number(v); return Number.isFinite(n) && n >= min ? n : null; };

  return (
    <section className="view">
      <h1>Settings</h1>
      {note && <p className={"msg" + (note.kind === "err" ? " err" : "")} role={note.kind === "err" ? "alert" : "status"} style={{ marginBottom: 16 }}>{note.text}</p>}

      <div className="ed-sec" style={{ marginTop: 8 }}>
        <div className="ed-head"><h2>Time and defaults</h2></div>
        <div className="f">
          <label htmlFor="tz">Timezone</label>
          <select id="tz" value={profile.timezone} onChange={(e) => save({ timezone: e.target.value })}>
            {zones.length ? zones.map((z) => <option key={z}>{z}</option>) : <option>{profile.timezone}</option>}
          </select>
          <span className="h">Times in your log and calendar use this. They are stored as UTC.</span>
        </div>
        <div className="f">
          <span className="l">Default bias</span>
          <div className="seg" role="group" aria-label="Default bias">
            {(["bull", "bear"] as Bias[]).map((b) => <button key={b} className={b} aria-pressed={profile.default_bias === b} onClick={() => save({ default_bias: b })}>{b === "bull" ? "Bullish" : "Bearish"}</button>)}
          </div>
          <span className="h">Used when you start a fresh checklist.</span>
        </div>
        <div className="f">
          <span className="l">Theme</span>
          <div className="seg plain" role="group" aria-label="Theme">
            {(["system", "light", "dark"] as Theme[]).map((t) => <button key={t} aria-pressed={profile.theme === t} onClick={() => save({ theme: t })}>{t[0].toUpperCase() + t.slice(1)}</button>)}
          </div>
        </div>
      </div>

      <div className="ed-sec">
        <div className="ed-head"><h2>Daily guardrails</h2></div>
        <p className="sub">You get a warning on the checklist when you reach a limit. It never blocks you.</p>
        <div className="g2" style={{ marginTop: 10 }}>
          <div className="f"><label htmlFor="mt">Max trades per day</label>
            <input id="mt" type="number" inputMode="numeric" min={1} value={trades} onChange={(e) => setTrades(e.target.value)} onBlur={() => { const n = num(trades, 1); if (n) save({ max_trades_day: Math.round(n) }); else setTrades(String(profile.max_trades_day)); }} /></div>
          <div className="f"><label htmlFor="ml">Max daily loss (R)</label>
            <input id="ml" type="number" inputMode="decimal" step="0.5" min={0.5} value={loss} onChange={(e) => setLoss(e.target.value)} onBlur={() => { const n = num(loss, 0.5); if (n) save({ max_loss_r: n }); else setLoss(String(profile.max_loss_r)); }} /></div>
        </div>
      </div>

      <div className="ed-sec">
        <div className="ed-head"><h2>Instruments</h2></div>
        <ul className="rows" style={{ marginBottom: 12 }}>
          {instruments.map((s) => (
            <li key={s} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px" }}>
              <span className="mono">{s}</span>
              <button className="icon-btn" onClick={async () => { const e = await removeInstrument(s); if (e) setNote({ kind: "err", text: e }); }} aria-label={`Remove ${s}`}><X size={18} weight="bold" /></button>
            </li>
          ))}
        </ul>
        <form className="ed-row" onSubmit={async (e) => { e.preventDefault(); const err = await addInstrument(newInst); if (err) setNote({ kind: "err", text: err }); else setNewInst(""); }}>
          <div className="f" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="ni" className="sr">New instrument</label>
            <input id="ni" type="text" autoCapitalize="characters" placeholder="e.g. GBPUSD" value={newInst} onChange={(e) => setNewInst(e.target.value)} />
          </div>
          <button className="btn ghost" type="submit"><Plus size={20} weight="bold" />Add</button>
        </form>
      </div>

      <div className="ed-sec">
        <div className="ed-head"><h2>Strategies</h2></div>
        <Link href="/strategies" className="btn ghost block" style={{ textDecoration: "none" }}>Manage strategies</Link>
      </div>

      <div className="ed-sec">
        <div className="ed-head"><h2>Your data</h2></div>
        <p className="sub">Export everything as a backup or to use elsewhere. Importing a JSON export adds trades and strategies without touching what you have.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          <button className="btn ghost" onClick={() => exportFile("json")} disabled={busy}><DownloadSimple size={20} weight="bold" />Export JSON</button>
          <button className="btn ghost" onClick={() => exportFile("csv")} disabled={busy}><DownloadSimple size={20} weight="bold" />Export CSV</button>
          <button className="btn ghost" onClick={() => file.current?.click()} disabled={busy}><UploadSimple size={20} weight="bold" />Import JSON</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
        </div>
      </div>

      <div className="ed-sec stop">
        <div className="ed-head"><h2>Delete account</h2></div>
        <p className="sub">This permanently deletes your account, every trade, strategy and screenshot. It cannot be undone. Export first if you want a copy.</p>
        <div className="f" style={{ marginTop: 12 }}>
          <label htmlFor="del">Type DELETE to confirm</label>
          <input id="del" type="text" autoComplete="off" autoCapitalize="characters" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        </div>
        <button className="btn danger block" onClick={deleteAccount} disabled={confirmText !== "DELETE" || deleting}><Warning size={22} weight="bold" />{deleting ? "Deleting" : "Delete my account and data"}</button>
      </div>
    </section>
  );
}
