export type Trade = {
  id: string;
  taken_at: string;
  instrument: string;
  direction: "bull" | "bear";
  session: string | null;
  entry_type: string | null;
  checklist_version: number | null;
  checklist_snapshot: unknown;
  ticks: Record<string, boolean>;
  status: "valid" | "no_trade" | "incomplete";
  entry: number | null;
  stop: number | null;
  target: number | null;
  outcome: "Open" | "Win" | "Loss" | "Breakeven" | "Skipped";
  r_result: number | null;
  notes_pre: string | null;
  notes_post: string | null;
  tags: string[];
};

export const taken = (t: Trade) => t.outcome === "Win" || t.outcome === "Loss" || t.outcome === "Breakeven";
export const rOf = (t: Trade) => Number(t.r_result ?? 0);
export const fmtR = (r: number) => (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r).toFixed(1) + "R";
export const cls = (r: number) => (r > 0 ? "pos" : r < 0 ? "neg" : "");
export const ms = (t: Trade) => new Date(t.taken_at).getTime();
export const dayKey = (m: number) => {
  const d = new Date(m);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
export const fmtDay = (m: number) => new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" }).format(m);
export const fmtTime = (m: number) => new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }).format(m);
export function sessionFor(m: number) {
  const h = new Date(m).getUTCHours();
  return h < 7 ? "Asia" : h < 12 ? "London" : h < 21 ? "New York" : "Other";
}
export function localInput(m: number) {
  return new Date(m - new Date(m).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
