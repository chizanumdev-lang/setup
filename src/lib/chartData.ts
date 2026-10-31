// Turns a term's pattern into candlestick data for lightweight-charts, with a generated lead-in so it reads like a real chart.
// All prices are synthetic and illustrative.
import { DIAG, type Dir, type Spec } from "@/lib/diagram";
import { sw, type Bias } from "@/lib/checklist";

export type Bar = { time: number; open: number; high: number; low: number; close: number; color?: string; borderColor?: string; wickColor?: string };
export type Built = {
  bars: Bar[];
  levels: { price: number; title: string }[];
  zones: { l1: number; l2: number; p1: number; p2: number; label?: string }[];
  badges: { logical: number; price: number; n: number; dir: Dir }[];
  tags: { logical: number; text: string }[];
};

/** Direction of price into the pattern, per term (same order as DIAG). */
const LEAD: ("down" | "up" | "flat")[] = ["down", "down", "flat", "down", "up", "down", "up", "up", "flat"];

const LEAD_BARS = 8;
const STEP = 15 * 60; // seconds between bars (the time axis is hidden)
const BASE = Date.UTC(2025, 0, 6, 8, 0, 0) / 1000;
const price = (v: number) => 100 + v * 0.45;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Raw = [o: number, c: number, h: number, l: number, ghost?: boolean];

/** A believable random walk that ends exactly at `target` (all values in pattern units). */
function lead(target: number, dir: "down" | "up" | "flat", seed: number): Raw[] {
  const r = rng(seed);
  const drift = dir === "down" ? -2.6 : dir === "up" ? 2.6 : 0;
  const out: Raw[] = [];
  let prev = target - drift * LEAD_BARS;
  for (let i = 0; i < LEAD_BARS; i++) {
    const o = prev;
    const c = o + drift + (r() - 0.5) * 5;
    const h = Math.max(o, c) + r() * 2.2;
    const l = Math.min(o, c) - r() * 2.2;
    out.push([o, c, h, l]);
    prev = c;
  }
  const shift = target - prev;
  return out.map(([o, c, h, l]) => [o + shift, c + shift, h + shift, l + shift] as Raw);
}

export function build(spec: Spec, leadDir: "down" | "up" | "flat", seed: number, bias: Bias): Built {
  const flip = bias === "bear";
  const fv = (v: number) => (flip ? 100 - v : v);
  const raw: Raw[] = [...lead(spec.c[0][0], leadDir, seed), ...spec.c];
  const bars: Bar[] = raw.map(([o, c, h, l, ghost], i) => {
    const O = fv(o), C = fv(c), H = fv(flip ? l : h), L = fv(flip ? h : l);
    const bar: Bar = { time: BASE + i * STEP, open: price(O), high: price(H), low: price(L), close: price(C) };
    if (ghost) { bar.color = "rgba(0,0,0,0)"; bar.borderColor = "#8a948f"; bar.wickColor = "#8a948f"; }
    return bar;
  });
  const flipDir = (d: Dir): Dir => (flip ? (d === "u" ? "d" : d === "d" ? "u" : d) : d);
  return {
    bars,
    levels: (spec.lv ?? []).map((l) => ({ price: price(fv(l.v)), title: l.label })),
    zones: (spec.zones ?? []).map((z) => ({ l1: LEAD_BARS + z.from - 0.5, l2: LEAD_BARS + z.to - 0.5, p1: price(fv(z.v1)), p2: price(fv(z.v2)), label: z.label })),
    badges: spec.steps.map((s, k) => ({ logical: LEAD_BARS + s.i, price: price(fv(s.v)), n: s.n ?? k + 1, dir: flipDir(s.dir ?? "u") })),
    tags: (spec.tags ?? []).map(([i, text]) => ({ logical: LEAD_BARS + i, text: sw(text, bias) })),
  };
}

export const termSpec = (i: number): { spec: Spec; lead: "down" | "up" | "flat"; seed: number } => ({ spec: DIAG[i], lead: LEAD[i], seed: 1000 + i * 77 });

/** SMT divergence: two markets, one makes a new low and the other does not. */
export const SMT_NQ: Spec = {
  c: [[66, 58, 68, 56], [58, 49, 60, 44], [49, 60, 62, 47], [60, 68, 70, 58], [68, 50, 69, 36]],
  tags: [[1, "{Low|High}"], [4, "New {low|high}"]],
  steps: [{ i: 1, v: 44, dir: "d", n: 1, text: "" }, { i: 4, v: 36, dir: "d", n: 2, text: "" }],
};
export const SMT_ES: Spec = {
  c: [[66, 58, 68, 56], [58, 49, 60, 44], [49, 60, 62, 47], [60, 68, 70, 58], [68, 55, 69, 50]],
  tags: [[1, "{Low|High}"], [4, "{Higher low|Lower high}"]],
  steps: [{ i: 1, v: 44, dir: "d", n: 1, text: "" }, { i: 4, v: 50, dir: "d", n: 3, text: "" }],
};
