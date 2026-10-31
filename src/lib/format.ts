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
// All display uses the timezone from Settings (falls back to the browser's).
let TZ: string | undefined;
export const setTimeZone = (tz?: string) => { TZ = tz || undefined; };
export const getTimeZone = () => TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

export const dayKey = (m: number) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(m);
export const fmtDay = (m: number) => new Intl.DateTimeFormat(undefined, { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(m);
export const fmtTime = (m: number) => new Intl.DateTimeFormat(undefined, { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(m);
export const weekday = (m: number) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(m);
export function sessionFor(m: number) {
  const h = new Date(m).getUTCHours();
  return h < 7 ? "Asia" : h < 12 ? "London" : h < 21 ? "New York" : "Other";
}
/** Value for a datetime-local input, showing the instant in the chosen timezone. */
export function localInput(m: number) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(m).replace(" ", "T");
}

/** Read a datetime-local value as a wall-clock time in the chosen timezone and return the UTC instant. */
export function fromLocalInput(v: string): number {
  const [d, t] = v.split("T");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi] = (t ?? "00:00").split(":").map(Number);
  const asUtc = Date.UTC(y, mo - 1, da, h, mi);
  const offset = (ms: number) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: getTimeZone(), hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(ms).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms;
  };
  const guess = asUtc - offset(asUtc);
  return asUtc - offset(guess);
}
