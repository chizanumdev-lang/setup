// Schematic candle diagrams for each glossary term.
// Candle data is written in bullish orientation (higher value = higher price) and mirrored for bearish.
// Each diagram has numbered markers; the matching plain-language steps are listed under the drawing.
import { GLOSS, sw, type Bias } from "@/lib/checklist";

type Candle = [open: number, close: number, high: number, low: number, ghost?: boolean];
type Dir = "u" | "d" | "l" | "r";
type Spec = {
  c: Candle[];
  /** horizontal level; from/to are slot edges (0 = left edge of first candle) */
  lv?: { v: number; from: number; to: number; label: string }[];
  zones?: { v1: number; v2: number; from: number; to: number; label?: string }[];
  /** short labels under the candle (above it when mirrored) */
  tags?: [index: number, text: string][];
  ring?: [index: number, v: number][];
  steps: { i: number; v: number; dir?: Dir; text: string }[];
  smt?: boolean;
};

const DIAG: Spec[] = [
  // Candle 2 closure
  {
    c: [[78, 72, 80, 70], [72, 66, 74, 64], [66, 58, 68, 56], [58, 64, 66, 44], [64, 87, 90, 62, true]],
    lv: [{ v: 56, from: 2, to: 5, label: "C1 {low|high}" }],
    tags: [[2, "C1"], [3, "C2"], [4, "C3"]],
    steps: [
      { i: 3, v: 44, dir: "d", text: "C2 trades past the C1 {low|high} and takes the stops resting there." },
      { i: 3, v: 64, dir: "r", text: "C2 closes back {above|below} the C1 {low|high}. That is the closure." },
      { i: 4, v: 90, dir: "u", text: "C3 is expected to expand {up|down}, away from the sweep." },
    ],
  },
  // Candle 3 closure
  {
    c: [[78, 72, 80, 70], [72, 60, 74, 58], [61, 56, 63, 44], [56, 81, 84, 54], [81, 91, 94, 78, true]],
    lv: [{ v: 58, from: 1, to: 5, label: "C1 {low|high}" }],
    zones: [{ v1: 56, v2: 61, from: 2, to: 3.95 }],
    tags: [[1, "C1"], [2, "C2"], [3, "C3"], [4, "C4"]],
    steps: [
      { i: 2, v: 44, dir: "d", text: "C2 sweeps the C1 {low|high} but closes {below|above} it. No closure yet." },
      { i: 3, v: 83, dir: "u", text: "C3 closes {above|below} the whole C2 body (shaded). That is the C3 closure." },
      { i: 4, v: 94, dir: "u", text: "Candle 4 is the one you look to trade." },
    ],
  },
  // CISD
  {
    c: [[84, 78, 86, 76], [78, 70, 80, 68], [70, 62, 72, 60], [62, 54, 64, 50], [54, 60, 63, 52], [60, 89, 92, 58]],
    lv: [{ v: 84, from: 0, to: 6, label: "Series open" }],
    steps: [
      { i: 0, v: 86, dir: "u", text: "A run of {down|up}-close candles made the {low|high}. The first one opened at this level." },
      { i: 3, v: 50, dir: "d", text: "This is the swing {low|high}." },
      { i: 5, v: 92, dir: "u", text: "Price closes {above|below} the series open. The change in state of delivery is confirmed." },
    ],
  },
  // Protected swing
  {
    c: [[78, 70, 80, 68], [70, 58, 72, 56], [58, 53, 60, 50], [53, 58, 60, 51], [56, 60, 62, 42], [60, 82, 85, 58]],
    lv: [{ v: 50, from: 0, to: 4, label: "Equal {lows|highs}" }, { v: 38, from: 3.5, to: 6, label: "Stop" }],
    ring: [[4, 42]],
    steps: [
      { i: 1.5, v: 50, dir: "d", text: "Equal {lows|highs} leave stop orders resting {beneath|above} them." },
      { i: 4, v: 42, dir: "l", text: "Price sweeps {below|above} them, then reverses. The {low|high} it made is the protected swing." },
      { i: 5, v: 85, dir: "u", text: "A CISD confirms the swing." },
      { i: 5, v: 38, dir: "d", text: "Your stop goes {beyond|beyond} the protected {low|high}. If price breaks it, the idea is wrong." },
    ],
  },
  // Fair value gap
  {
    c: [[34, 38, 40, 32], [40, 50, 52, 38], [50, 80, 82, 49], [72, 86, 89, 62], [86, 84, 88, 80], [84, 72, 86, 58]],
    zones: [{ v1: 52, v2: 62, from: 1.5, to: 6, label: "Gap" }],
    tags: [[1, "1"], [2, "2"], [3, "3"]],
    steps: [
      { i: 1, v: 52, dir: "u", text: "Candle 1's {high|low}." },
      { i: 3, v: 62, dir: "d", text: "Candle 3's {low|high}. The wicks of candles 1 and 3 don't overlap, leaving a gap." },
      { i: 5, v: 58, dir: "d", text: "Price often returns to fill the gap." },
    ],
  },
  // SMT divergence (drawn separately)
  {
    c: [],
    smt: true,
    steps: [
      { i: 0, v: 0, text: "Both markets make a {low|high} together." },
      { i: 0, v: 0, text: "NQ then makes a new {low|high}." },
      { i: 0, v: 0, text: "ES does not. It holds {a higher low|a lower high}. That disagreement is the divergence." },
    ],
  },
  // EQ
  {
    c: [[34, 40, 42, 32], [40, 84, 88, 36], [84, 78, 86, 66], [78, 86, 90, 70], [86, 88, 92, 80]],
    lv: [{ v: 62, from: 1, to: 5, label: "EQ" }],
    tags: [[1, "C3"]],
    steps: [
      { i: 1, v: 88, dir: "u", text: "Take the range of C3, wick to wick." },
      { i: 3, v: 62, dir: "d", text: "EQ is the 50% level of that range." },
      { i: 2, v: 66, dir: "d", text: "In a candle 4 continuation, price should hold the {upper|lower} half." },
    ],
  },
  // Draw on liquidity
  {
    c: [[80, 70, 92, 66], [70, 60, 72, 56], [60, 50, 62, 46], [50, 60, 62, 48], [60, 70, 72, 58], [70, 80, 82, 68], [80, 92, 95, 78, true]],
    lv: [{ v: 92, from: 0, to: 7, label: "Old {high|low}" }],
    steps: [
      { i: 0, v: 92, dir: "u", text: "An old {high|low}, with stop orders resting beyond it." },
      { i: 4, v: 72, dir: "u", text: "Price climbs toward it and has not reached it yet." },
      { i: 6, v: 95, dir: "u", text: "That level is the draw on liquidity, so it is the likely target." },
    ],
  },
  // Failure swing
  {
    c: [[76, 68, 78, 66], [68, 58, 70, 56], [58, 53, 60, 51], [52, 48, 54, 40], [48, 44, 50, 36], [44, 46, 48, 40]],
    lv: [{ v: 51, from: 0, to: 6, label: "Level" }],
    steps: [
      { i: 3, v: 40, dir: "d", text: "Price sweeps the level." },
      { i: 3, v: 48, dir: "r", text: "It closes {below|above} the level instead of back {above|below}. There is no C2 or C3 closure." },
      { i: 5, v: 40, dir: "d", text: "With no closure and no CISD this is a failure swing. It is not a swing point to trade." },
    ],
  },
];

const W = 360, H = 224, PAD = 20, GUT = 82; // GUT: right gutter that holds level labels

export function diagram(index: number, bias: Bias): string {
  const d = DIAG[index];
  if (!d) return "";
  const flip = bias === "bear";
  // the tag row sits at the bottom (top when mirrored), so reserve more room on that side
  const top = flip ? 54 : 34, bot = flip ? 34 : 54;
  // fit the drawing to the canvas so candles are as large as the data allows
  const vals = [...d.c.flatMap((c) => [c[2], c[3]]), ...(d.lv ?? []).map((l) => l.v), ...(d.zones ?? []).flatMap((z) => [z.v1, z.v2]), ...(d.ring ?? []).map((r) => r[1])];
  const lo = d.smt ? 0 : Math.min(...vals), hi = d.smt ? 100 : Math.max(...vals), span = hi - lo || 1;
  const y = (v: number) => {
    const t = (v - lo) / span;
    return flip ? top + t * (H - top - bot) : H - bot - t * (H - top - bot);
  };
  const n = Math.max(d.c.length, 1);
  const plotR = W - GUT;
  const slot = (plotR - PAD) / n;
  const X = (i: number) => PAD + slot * (i + 0.5);
  const E = (e: number) => PAD + slot * e;
  const up = (dir: Dir | undefined) => (dir === "u" ? (flip ? "d" : "u") : dir === "d" ? (flip ? "u" : "d") : dir);
  let g = "";

  if (d.smt) {
    const A = [[0.08, 64], [0.28, 40], [0.5, 58], [0.86, 24]];
    const B = [[0.08, 64], [0.28, 40], [0.5, 58], [0.86, 46]];
    const v2 = (v: number) => (flip ? 100 - v : v);
    const panel = (pts: number[][], ox: number, label: string, marks: [number, number][]) => {
      const px = (f: number) => ox + 14 + f * 140;
      const line = pts.map(([f, v]) => `${px(f).toFixed(1)},${y(v2(v)).toFixed(1)}`).join(" ");
      const dots = [pts[1], pts[3]].map(([f, v]) => `<circle class="pd" cx="${px(f)}" cy="${y(v2(v))}" r="5"/>`).join("");
      const badges = marks.map(([k, fi]) => badge(k, px(pts[fi][0]), y(v2(pts[fi][1])) + (flip ? -18 : 18))).join("");
      return `<text x="${ox + 14}" y="${flip ? H - 8 : 14}">${label}</text><polyline class="pl" points="${line}"/>${dots}${badges}`;
    };
    g = panel(A, 6, "NQ", [[1, 1], [2, 3]]) + panel(B, 186, "ES", [[1, 1], [3, 3]]);
  } else {
    (d.zones ?? []).forEach((z) => {
      const ya = y(z.v1), yb = y(z.v2);
      g += `<rect class="zn" x="${E(z.from)}" y="${Math.min(ya, yb)}" width="${E(z.to) - E(z.from)}" height="${Math.abs(ya - yb)}"/>`;
      if (z.label) g += `<text x="${plotR + 6}" y="${(ya + yb) / 2 + 4}">${sw(z.label, bias)}</text>`;
    });
    (d.lv ?? []).forEach((l) => {
      const x1 = E(l.from), x2 = Math.min(plotR, E(l.to));
      g += `<line class="ln" x1="${x1}" x2="${x2}" y1="${y(l.v)}" y2="${y(l.v)}"/>`;
      g += `<text x="${plotR + 6}" y="${y(l.v) + 4}">${sw(l.label, bias)}</text>`;
    });
    d.c.forEach(([o, c, h, lo, ghost], k) => {
      const x = X(k), yo = y(o), yc = y(c), isUp = yc < yo;
      const col = ghost ? "var(--muted)" : isUp ? "var(--bull)" : "var(--bear)";
      const bodyH = Math.max(3, Math.abs(yo - yc)), by = Math.min(yo, yc);
      if (ghost) {
        g += `<line x1="${x}" x2="${x}" y1="${y(h)}" y2="${y(lo)}" stroke="var(--muted)" stroke-width="2" stroke-dasharray="3 3"/><rect class="gh" x="${x - 9}" y="${by}" width="18" height="${bodyH}"/>`;
      } else {
        g += `<line x1="${x}" x2="${x}" y1="${y(h)}" y2="${y(lo)}" stroke="${col}" stroke-width="2.5"/><rect x="${x - 9}" y="${by}" width="18" height="${bodyH}" fill="${col}"/>`;
      }
    });
    (d.tags ?? []).forEach(([i, t]) => {
      g += `<text x="${X(i)}" y="${flip ? 14 : H - 6}" text-anchor="middle">${t}</text>`;
    });
    (d.ring ?? []).forEach(([i, v]) => { g += `<circle class="ring" cx="${X(i)}" cy="${y(v)}" r="9"/>`; });
    d.steps.forEach((s, k) => {
      const dir = up(s.dir) ?? "u";
      const ox = dir === "r" ? 18 : dir === "l" ? -18 : 0, oy = dir === "u" ? -17 : dir === "d" ? 17 : 0;
      g += badge(k + 1, X(s.i) + ox, y(s.v) + oy);
    });
  }

  const steps = d.steps.map((s, k) => `<li><span class="bd">${k + 1}</span><span>${sw(s.text, bias)}</span></li>`).join("");
  return `<figure class="dg"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${GLOSS[index][0]}, schematic. Steps are listed below.">${g}</svg><ol class="dg-steps">${steps}</ol></figure>`;
}

function badge(n: number, x: number, y: number) {
  return `<g><circle class="bg" cx="${x}" cy="${y}" r="9.5"/><text class="bn" x="${x}" y="${y + 3.7}" text-anchor="middle">${n}</text></g>`;
}
