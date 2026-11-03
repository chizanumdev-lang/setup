// The winning profile. It describes your own history and stays silent until there is enough of it.
import type { Verdict } from "@/lib/ai";

/** No profile, and no percentage, until this much checked history exists. */
export const MIN_DAYS = 30;
export const MIN_TRADES = 10;
/** A step needs this many trades on each side before its win rates are compared. */
export const MIN_SIDE = 3;

const DAY = 86_400_000;

export type TradeProof = {
  takenAt: number;
  outcome: "Open" | "Win" | "Loss" | "Breakeven" | "Skipped";
  steps: Record<string, Verdict | null>;   // one verdict per checklist step
};

const isTaken = (t: TradeProof) => t.outcome === "Win" || t.outcome === "Loss" || t.outcome === "Breakeven";
const hasChecked = (t: TradeProof) => Object.values(t.steps).some((v) => v !== null);

export type Readiness = { ready: boolean; days: number; trades: number; needDays: number; needTrades: number; startedAt: number | null };

/**
 * Ready only when the checked trades span at least MIN_DAYS and there are at least MIN_TRADES of them.
 * The clock starts at the first taken trade that has any checked screenshot.
 */
export function readiness(all: TradeProof[], now: number): Readiness {
  const eligible = all.filter((t) => isTaken(t) && hasChecked(t));
  const startedAt = eligible.length ? Math.min(...eligible.map((t) => t.takenAt)) : null;
  const days = startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / DAY));
  return { ready: days >= MIN_DAYS && eligible.length >= MIN_TRADES, days, trades: eligible.length, needDays: MIN_DAYS, needTrades: MIN_TRADES, startedAt };
}

export type StepStat = { key: string; withWR: number; withoutWR: number; nWith: number; nWithout: number; lift: number; weight: number };
export type Profile = { trades: number; steps: StepStat[]; proven: { wr: number; n: number }; other: { wr: number; n: number } };

const winRate = (list: TradeProof[]) => (list.length ? list.filter((t) => t.outcome === "Win").length / list.length : 0);

/** For each step: win rate when its proof was valid against when it was not. The lift becomes the step's weight. */
export function buildProfile(all: TradeProof[]): Profile {
  const taken = all.filter((t) => isTaken(t) && hasChecked(t));
  const keys = [...new Set(taken.flatMap((t) => Object.keys(t.steps)))];
  const steps: StepStat[] = [];
  for (const key of keys) {
    const yes = taken.filter((t) => t.steps[key] === "valid");
    const no = taken.filter((t) => t.steps[key] !== "valid");
    if (yes.length < MIN_SIDE || no.length < MIN_SIDE) continue;
    const lift = winRate(yes) - winRate(no);
    steps.push({ key, withWR: winRate(yes), withoutWR: winRate(no), nWith: yes.length, nWithout: no.length, lift, weight: Math.max(0, lift) });
  }
  steps.sort((a, b) => b.lift - a.lift);
  const allValid = (t: TradeProof) => { const v = Object.values(t.steps).filter((x) => x !== null); return v.length > 0 && v.every((x) => x === "valid"); };
  const proven = taken.filter(allValid), other = taken.filter((t) => !allValid(t));
  return { trades: taken.length, steps, proven: { wr: winRate(proven), n: proven.length }, other: { wr: winRate(other), n: other.length } };
}

/** How much of the profile's weight is currently backed by valid proof. Null when the profile has nothing to weigh. */
export function matchScore(profile: Profile, current: Record<string, Verdict | null>): number | null {
  const total = profile.steps.reduce((a, s) => a + s.weight, 0);
  if (total <= 0) return null;
  const got = profile.steps.reduce((a, s) => a + (current[s.key] === "valid" ? s.weight : 0), 0);
  return Math.round((got / total) * 100);
}
