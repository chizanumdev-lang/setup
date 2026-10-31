export type Bias = "bull" | "bear";
export type Level = 0 | 1 | 2; // 0 optional, 1 required, 2 no-go
export type Item = [key: string, title: string, desc: string, level: Level];
export type Step = { id: string; title: string; tf: string; short?: string; goal: string; stop?: boolean; items: Item[] };
export type Ticks = Record<string, boolean>;
export type Status = "valid" | "no_trade" | "incomplete";

export const STEPS: Step[] = [
  { id: "d", title: "Daily bias", tf: "1D + 1H", short: "1D", goal: "Anticipate a daily expansion candle.", items: [
    ["dol", "Draw on liquidity marked", "Old {high|low}, range {high|low}, or HTF key level price is heading to, and not yet reached.", 1],
    ["c2", "Daily candle 2 or candle 3 closure", "C2: previous day's {low|high} swept and closed back {above|below} it. C3: next candle closed over C2's body.", 1],
    ["poi", "Daily swing formed at a point of interest", "Swept {lows|highs} and/or reacted from a daily FVG. Ideal if it also closed over the {down|up}-close series (protected swing).", 0],
    ["h1", "1H CISD inside the swing candle", "Hourly close through the series of candles that made the daily {low|high}. No CISD = no bias.", 1],
    ["which", "Know which candle you're trading", "Candle 3 after a C2. Candle 4 if C3 closed beyond C2's {high|low}; then price should hold C3's EQ.", 1],
  ] },
  { id: "h4", title: "4H swing point", tf: "4H + 15m", short: "4H", goal: "Let the 4H build the daily {lower|upper} wick.", items: [
    ["open", "Price opens and trades {lower|higher} first", "Ideal: forming the daily {low|high} early in the day.", 0],
    ["h4c2", "4H candle 2 or candle 3 closure inside today's daily candle", "Sweep of a 4H {low|high} and/or tap into a 4H FVG.", 1],
    ["m15", "15m CISD confirms the 4H swing", "If you only see failure swings, wait for the next candle.", 1],
  ] },
  { id: "e", title: "15m entry", tf: "15m", short: "15m", goal: "Trade a continuation off a new protected swing.", items: [
    ["ps", "New 15m protected swing", "Sweep a {low|high} and/or tap a 15m FVG, then close {over|under} the {down|up}-close candles.", 1],
    ["chase", "Not chasing", "If price already took the 4H {high|low} this candle, wait for a retracement or consolidation.", 1],
    ["type", "Entry type chosen", "Reversal (wider stop), continuation (tight stop), retest of the continuation, or positional entry near the daily open.", 1],
    ["smt", "SMT with a correlated market", "Optional extra confirmation.", 0],
    ["sess", "Inside a killzone / session open", "The video waits for the New York session after a retracement.", 0],
  ] },
  { id: "r", title: "Risk & management", tf: "Plan", short: "Risk", goal: "Know the exit before the entry.", items: [
    ["sl", "Stop beyond the protected swing {low|high}", "", 1],
    ["rr", "At least 2R available to the first target", "", 1],
    ["run", "Runner plan set", "Hold part toward the HTF draw or the daily close if you entered near the open.", 0],
  ] },
  { id: "x", title: "Skip the trade if…", tf: "No-go", goal: "Any one of these cancels the setup.", stop: true, items: [
    ["x1", "Trade goes against the daily candle direction", "", 2],
    ["x2", "No CISD on the lower timeframe", "", 2],
    ["x3", "No 4H swing point today (only failure swings)", "", 2],
    ["x4", "Draw on liquidity already hit", "", 2],
    ["x5", "Stop can't fit inside your risk for 2R", "", 2],
  ] },
];

export const GLOSS: [string, string][] = [
  ["Candle 2 closure (C2)", "A candle sweeps the previous candle's {low|high} and closes back {above|below} it. This signals a reversal, so you anticipate candle 3 to expand {up|down}."],
  ["Candle 3 closure (C3)", "Candle 2 swept but failed to close back inside. The next candle then closes over candle 2's body, engulfing it. You then look to trade candle 4."],
  ["Change in state of delivery (CISD)", "Find the series of {down|up}-close candles that made the {low|high}. When price closes {above|below} the opening level of that series, the swing is confirmed."],
  ["Protected swing", "A {low|high} that sweeps liquidity and/or taps a fair value gap, followed by a CISD. Your stop goes beyond it; if price breaks it, the idea is wrong."],
  ["Fair value gap (FVG)", "A three-candle gap where the wicks of candles 1 and 3 don't overlap, leaving an imbalance price often returns to."],
  ["SMT divergence", "Two correlated markets (e.g. ES and NQ, or BTC and ETH) disagree: one makes a new {low|high} and the other doesn't. It adds confidence to the swing."],
  ["EQ", "The 50% level of a candle's range. In a candle 4 continuation, price should hold the {upper|lower} half of candle 3."],
  ["Draw on liquidity", "The higher-timeframe target price is likely heading to: an old {high|low}, range {high|low}, or unfilled gap."],
  ["Failure swing", "Price sweeps a level but never confirms with a C2/C3 closure and CISD. It's not a tradeable swing point."],
];

export const TIPS: [string, string][] = [
  ["Risk a fixed small slice", "Many traders use 0.5 to 1% of the account per trade. Size the position from the stop distance, not the other way round."],
  ["Check the economic calendar", "High-impact news (CPI, NFP, FOMC) can blow through a perfect setup."],
  ["Set a daily limit", "For example two trades or one full loss, then stop."],
  ["Review with screenshots", "Capture the daily, 4H and 15m charts for each trade and note which checklist items were present. After 30 to 50 trades you will see which ones matter for you."],
  ["Backtest first", "Run the model on replay, as in the video, before using real money."],
];

export const ITEMS: Record<string, { t: string; d: string; r: Level; step: string }> = {};
STEPS.forEach((s) => s.items.forEach(([k, t, d, r]) => { ITEMS[k] = { t, d, r, step: s.id }; }));
export const REQ = Object.keys(ITEMS).filter((k) => ITEMS[k].r === 1);
export const NOGO = Object.keys(ITEMS).filter((k) => ITEMS[k].r === 2);
export const OPTIONAL = Object.keys(ITEMS).filter((k) => ITEMS[k].r === 0);
export const CHECKLIST_NAME = "Candle Three";
export const CHECKLIST_VERSION = 1;

/** Swap {bull|bear} wording for the chosen bias. */
export const sw = (s: string, b: Bias): string => s.replace(/\{([^|}]*)\|([^}]*)\}/g, (_, a, c) => (b === "bull" ? a : c));

export function statusOf(t: Ticks): Status {
  if (NOGO.some((k) => t[k])) return "no_trade";
  return REQ.every((k) => t[k]) ? "valid" : "incomplete";
}

/** Frozen copy of the checklist saved with each trade, so later edits never rewrite history. */
export function snapshot() {
  return {
    name: CHECKLIST_NAME,
    version: CHECKLIST_VERSION,
    items: Object.entries(ITEMS).map(([k, v]) => ({ key: k, title: v.t, level: v.r })),
  };
}
