// Pattern data for each glossary term. Candles are written in bullish orientation (higher value = higher price)
// and mirrored for bearish. Each pattern has numbered markers with matching plain-language steps.

type Candle = [open: number, close: number, high: number, low: number, ghost?: boolean];
export type Dir = "u" | "d" | "l" | "r";
export type Spec = {
  c: Candle[];
  /** horizontal level; from/to are slot edges (0 = left edge of first candle) */
  lv?: { v: number; from: number; to: number; label: string }[];
  zones?: { v1: number; v2: number; from: number; to: number; label?: string }[];
  /** short labels under the candle (above it when mirrored) */
  tags?: [index: number, text: string][];
  ring?: [index: number, v: number][];
  steps: { i: number; v: number; dir?: Dir; text: string; n?: number }[];
  smt?: boolean;
};

export const DIAG: Spec[] = [
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
      { i: 1, v: 62, dir: "l", text: "EQ is the 50% level of that range." },
      { i: 3, v: 90, dir: "u", text: "In a candle 4 continuation, price should hold the {upper|lower} half." },
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
