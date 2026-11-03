// Ready-made strategies a user can add to their own account and then edit.
// Wording uses {bull|bear} pairs, like the built-in checklist.
import type { Step } from "@/lib/checklist";

export type Template = { id: string; name: string; blurb: string; version: number; steps: Step[] };

const FRACTAL_STEPS: Step[] = [
  { id: "fp-bias", title: "Daily bias", tf: "1D", goal: "Get one-sided bias and a draw on liquidity before you drop down.", items: [
    ["fp_close", "Daily closure gives a one-sided bias", "Price closed {above|below} the previous day's {high|low} (continuation), or swept it and closed back inside (reversal). No bias, no trade.", 1],
    ["fp_candle", "Know which candle you are in", "Candle 2 is the swing, candle 3 follows, candle 4 is always the continuation. Look for price to hold the {upper|lower} half of candle 3.", 1],
    ["fp_draw", "Draw on liquidity marked", "Previous day or week {high|low}, or an old swing, that price is heading to. Failure swings make the easiest target.", 1],
    ["fp_eq", "Previous candle's EQ is respected", "Measure wick to wick. In expansion price holds the {upper|lower} half. A close through EQ weakens the idea.", 1],
    ["fp_wick", "Wick supports the move", "A small wick supports expansion, so candle 2 is tradable. A large wick means let it close and trade candle 3, aiming at the daily open or session {low|high}.", 0],
    ["fp_phase", "Phase of price read", "Expansion, retracement, consolidation or reversal. After a consolidation wait for the manipulation. After expansion expect a new phase.", 0],
    ["fp_week", "Weekly {high|low} or a swing frames the target", "The previous week's {high|low} or a swing point adds confluence to the draw.", 0],
  ] },
  { id: "fp-struct", title: "Structure and point of interest", tf: "1H / 4H", short: "Struct", goal: "Align the structure time frame and find where price should react.", items: [
    ["fp_align", "Time frames aligned", "Pair daily with 1H, 4H with 15m, 1H with 5m, 30m with 3m, 15m with 1m. Bias, structure and entry all point {up|down}.", 1],
    ["fp_cisd_s", "CISD on the structure time frame", "Price closed {above|below} the open of the series of {down|up}-close candles that made the swing, confirming candle 2.", 1],
    ["fp_poi", "Point of interest in the range", "From the reversal to the current range, a fair value gap first, then a swing {low|high}. Use the CISD level, held at 50%, only if neither exists.", 1],
    ["fp_react", "Price reaches it and the candle closes", "A sweep of the {low|high} or a tap into the gap, then a candle closure back {above|below}. Wait for the candle to close.", 1],
    ["fp_manip", "Manipulation seen if consolidating", "In a range, wait for one side to be taken ({low|high} for a {long|short}) and an aggressive move back in. Without it, stay out.", 0],
    ["fp_smt", "SMT with a correlated market", "One market sweeps the {low|high} and the other does not. It counts as the sweep.", 0],
    ["fp_res", "Target low resistance, stop behind high resistance", "Failure swings are the target. A level that has already been swept is your invalidation.", 0],
  ] },
  { id: "fp-entry", title: "Entry", tf: "15m / 5m", short: "Entry", goal: "Confirm on the entry time frame and choose the entry.", items: [
    ["fp_cisd_e", "CISD on the entry time frame", "Closes {above|below} the series of {down|up}-close candles into the point of interest, in line with the structure time frame.", 1],
    ["fp_prot", "Protected swing formed", "The {low|high} swept liquidity or tapped a fair value gap, then price closed through the candles that made it. Expect it to hold.", 1],
    ["fp_chase", "Not chasing", "If price has already run, wait for the next protected swing, or use a limit so 2R still fits.", 1],
    ["fp_model", "Entry type chosen", "Reversal, continuation, retest or positional. Continuations are easier and keep the stop tight.", 1],
    ["fp_pos", "Positional entry only above the EQ", "At the open of the next candle, with the stop on a protected swing beyond candle 2's EQ.", 0],
    ["fp_iccisd", "Wick has formed inside the candle", "An intra-candle CISD in candle 3 or 4 shows the wick is done. Best early in the candle. If it comes late, take the next candle.", 0],
    ["fp_ob", "Order block is valid", "A {down|up}-close candle into an important level, closed through, with 50% of its bodies holding.", 0],
  ] },
  { id: "fp-risk", title: "Risk and targets", tf: "Plan", short: "Risk", goal: "Know the exit before the entry.", items: [
    ["fp_sl", "Stop on the protected swing", "Beyond the swing. Move it to the body only if the body is beyond 50% of the opposing run.", 1],
    ["fp_rr", "At least 2R to the first target", "Fit the stop to the setup, then check 2R. If it fails, wait for a new continuation or use a limit.", 1],
    ["fp_tgt", "Target chosen", "Previous day {high|low}, the -2 to -2.5 projection then -4, or a higher time frame level for runners. After a large wick aim at the daily open.", 0],
    ["fp_order", "Market or limit decided", "Market by default. Use a limit only when price ran too far for 2R, and accept you may not get filled.", 0],
  ] },
  { id: "x", title: "Skip the trade if…", tf: "No-go", goal: "Any one of these cancels the setup.", stop: true, items: [
    ["fp_x1", "Trade goes against the daily bias, or there is no bias", "", 2],
    ["fp_x2", "No CISD on the structure or entry time frame", "", 2],
    ["fp_x3", "No point of interest in the range", "An order block with no important level does not count.", 2],
    ["fp_x4", "Consolidating and neither side has been manipulated yet", "", 2],
    ["fp_x5", "Three days of expansion into an objective", "A new phase of price is likely. Let another candle print.", 2],
    ["fp_x6", "Price closed through the previous candle's EQ", "The idea is failing. Only trade the other way if an opposing setup forms.", 2],
    ["fp_x7", "The draw on liquidity has already been taken", "", 2],
    ["fp_x8", "The stop cannot give 2R, even with a limit or a new swing", "", 2],
  ] },
];

export const TEMPLATES: Template[] = [
  {
    id: "fractal-playbook",
    name: "Fractal Playbook",
    blurb: "Daily bias, structure, entry and risk for the candle 2, 3 and 4 model, built from your video notes. Required, optional and no-go items are marked.",
    version: 1,
    steps: FRACTAL_STEPS,
  },
];
