// Export and import of trades. Pure functions so they can be tested without a browser or database.
import type { Trade } from "@/lib/format";

export const EXPORT_VERSION = 1;
const OUTCOMES = ["Open", "Win", "Loss", "Breakeven", "Skipped"];
const STATUSES = ["valid", "no_trade", "incomplete"];
const SESSIONS = ["Asia", "London", "New York", "Other"];
const TYPES = ["Reversal", "Continuation", "Retest", "Positional"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ExportFile = { app: "candle-three"; version: number; exported_at: string; trades: Trade[]; strategies: { id: string; name: string; version: number; items: unknown }[] };

export function buildExport(trades: Trade[], strategies: ExportFile["strategies"]): ExportFile {
  return { app: "candle-three", version: EXPORT_VERSION, exported_at: new Date().toISOString(), trades, strategies };
}

const q = (v: unknown) => {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(trades: Trade[]): string {
  const cols = ["id", "taken_at_utc", "instrument", "direction", "session", "entry_type", "strategy", "status", "outcome", "r_result", "entry", "stop", "target", "notes_before", "notes_after", "tags"];
  const rows = trades.map((t) => {
    const snap = (t.checklist_snapshot ?? {}) as { name?: string };
    return [t.id, t.taken_at, t.instrument, t.direction === "bull" ? "long" : "short", t.session, t.entry_type, snap.name ?? "Candle Three", t.status, t.outcome, t.r_result, t.entry, t.stop, t.target, t.notes_pre, t.notes_post, (t.tags ?? []).join("; ")];
  });
  return [cols, ...rows].map((r) => r.map(q).join(",")).join("\n");
}

export type ImportRow = Record<string, unknown>;
export type Parsed = { rows: ImportRow[]; strategies: { id: string; name: string; version: number; items: unknown }[]; skipped: number; error?: string };

const numOrNull = (v: unknown) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

/** Check an export file and turn its trades into insertable rows for `userId`. Bad rows are counted and skipped. */
export function parseImport(text: string, userId: string): Parsed {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { rows: [], strategies: [], skipped: 0, error: "That file isn't valid JSON." }; }
  const d = data as Partial<ExportFile>;
  if (!d || d.app !== "candle-three" || !Array.isArray(d.trades)) return { rows: [], strategies: [], skipped: 0, error: "This doesn't look like a Candle Three export." };
  if (typeof d.version === "number" && d.version > EXPORT_VERSION) return { rows: [], strategies: [], skipped: 0, error: "This export is from a newer version of the app." };

  const rows: ImportRow[] = [];
  let skipped = 0;
  for (const raw of d.trades as Partial<Trade>[]) {
    const when = raw?.taken_at ? new Date(raw.taken_at) : null;
    const ok = raw && typeof raw.instrument === "string" && raw.instrument.trim() && (raw.direction === "bull" || raw.direction === "bear") &&
      when && !Number.isNaN(when.getTime()) && STATUSES.includes(String(raw.status)) && OUTCOMES.includes(String(raw.outcome));
    if (!ok) { skipped++; continue; }
    rows.push({
      id: raw.id && UUID.test(raw.id) ? raw.id : crypto.randomUUID(),
      user_id: userId,
      taken_at: when!.toISOString(),
      instrument: raw.instrument!.trim().toUpperCase(),
      direction: raw.direction,
      session: SESSIONS.includes(String(raw.session)) ? raw.session : null,
      entry_type: TYPES.includes(String(raw.entry_type)) ? raw.entry_type : null,
      checklist_version: numOrNull(raw.checklist_version),
      checklist_snapshot: raw.checklist_snapshot ?? null,
      ticks: raw.ticks && typeof raw.ticks === "object" ? raw.ticks : {},
      status: raw.status,
      entry: numOrNull(raw.entry), stop: numOrNull(raw.stop), target: numOrNull(raw.target),
      outcome: raw.outcome,
      r_result: numOrNull(raw.r_result),
      notes_pre: typeof raw.notes_pre === "string" ? raw.notes_pre : null,
      notes_post: typeof raw.notes_post === "string" ? raw.notes_post : null,
      tags: Array.isArray(raw.tags) ? raw.tags.filter((x): x is string => typeof x === "string") : [],
    });
  }
  const strategies = Array.isArray(d.strategies) ? d.strategies.filter((s) => s && typeof s.name === "string" && Array.isArray(s.items)) : [];
  return { rows, strategies, skipped };
}
