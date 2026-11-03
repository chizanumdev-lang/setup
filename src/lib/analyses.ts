// Several analyses can be in progress at once. This is the pure part: shapes and how local and server copies merge.
import type { Bias, Ticks } from "@/lib/checklist";

export type Analysis = {
  id: string;
  label: string;
  bias: Bias;
  sid: string | null;     // strategy id, null = built-in
  ticks: Ticks;
  at: number;             // last change (ms)
  created: number;
  synced?: boolean;       // has reached the server at least once
  dirty?: boolean;        // has changes the server has not seen
};

export type ServerDraft = { id: string; label: string | null; bias: Bias; ticks: Ticks | null; checklist_id: string | null; updated_at: string; created_at: string };

export const fromServer = (r: ServerDraft): Analysis => ({
  id: r.id, label: r.label ?? "", bias: r.bias, sid: r.checklist_id ?? null, ticks: r.ticks ?? {},
  at: new Date(r.updated_at).getTime(), created: new Date(r.created_at).getTime(), synced: true, dirty: false,
});

/**
 * Combine what this device has with what the server has.
 * Unsent local edits win, otherwise the newer side wins. An analysis the server no longer has
 * (finished or discarded on another device) is dropped, unless this device created it and has not sent it yet.
 * `deleted` lists ids this device discarded that the server may still hold.
 */
export function mergeAnalyses(local: Analysis[], server: ServerDraft[], deleted: string[]): Analysis[] {
  const gone = new Set(deleted);
  const byId = new Map(local.map((a) => [a.id, a]));
  const out: Analysis[] = [];
  for (const row of server) {
    if (gone.has(row.id)) continue;
    const s = fromServer(row);
    const l = byId.get(row.id);
    if (!l) out.push(s);
    else if (l.dirty) out.push({ ...l, synced: true });
    else out.push(s.at > l.at ? s : { ...l, synced: true });
  }
  const onServer = new Set(server.map((r) => r.id));
  for (const l of local) {
    if (onServer.has(l.id) || gone.has(l.id)) continue;
    if (l.synced && !l.dirty) continue;   // finished or discarded elsewhere
    out.push(l);                          // new here, still to send
  }
  return out.sort((a, b) => a.created - b.created);
}

export function nextLabel(items: Analysis[]): string {
  const used = new Set(items.map((a) => a.label));
  for (let n = items.length + 1; n < items.length + 50; n++) if (!used.has(`Analysis ${n}`)) return `Analysis ${n}`;
  return "Analysis";
}

export const displayLabel = (a: Analysis, i: number) => a.label.trim() || `Analysis ${i + 1}`;
