import { describe, expect, it } from "vitest";
import { MIN_DAYS, MIN_TRADES, buildProfile, matchScore, readiness, type TradeProof } from "@/lib/profileMatch";
import { effective, parseVerdict, stepVerdict } from "@/lib/ai";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 3);
const t = (daysAgo: number, outcome: TradeProof["outcome"], steps: TradeProof["steps"]): TradeProof => ({ takenAt: NOW - daysAgo * DAY, outcome, steps });

describe("when the profile is allowed to speak", () => {
  it("is not ready with no checked trades", () => {
    expect(readiness([], NOW)).toMatchObject({ ready: false, days: 0, trades: 0 });
    expect(readiness([t(40, "Win", {})], NOW).ready).toBe(false);   // a trade with no checked proof does not start the clock
  });
  it("is not ready before a full month, however many trades", () => {
    const many = Array.from({ length: 30 }, (_, i) => t(i % 25, "Win", { a: "valid" }));
    const r = readiness(many, NOW);
    expect(r.days).toBeLessThan(MIN_DAYS);
    expect(r.ready).toBe(false);
  });
  it("is not ready after a month if there are too few trades", () => {
    const few = Array.from({ length: MIN_TRADES - 1 }, (_, i) => t(40 - i, "Win", { a: "valid" }));
    expect(readiness(few, NOW).ready).toBe(false);
  });
  it("is ready after a month with enough checked trades", () => {
    const ok = Array.from({ length: MIN_TRADES }, (_, i) => t(31 + i, "Win", { a: "valid" }));
    expect(readiness(ok, NOW)).toMatchObject({ ready: true });
  });
  it("counts the clock from the first checked taken trade, not skipped ones", () => {
    const list = [t(60, "Skipped", { a: "valid" }), ...Array.from({ length: MIN_TRADES }, (_, i) => t(10 + i, "Win", { a: "valid" }))];
    expect(readiness(list, NOW).days).toBe(19);
  });
  it("reports how far along it is", () => {
    const r = readiness([t(12, "Win", { a: "valid" }), t(5, "Loss", { a: "invalid" })], NOW);
    expect(r).toMatchObject({ days: 12, trades: 2, needDays: 30, needTrades: 10 });
  });
});

describe("profile and match", () => {
  const trades: TradeProof[] = [
    ...Array.from({ length: 6 }, (_, i) => t(40 + i, "Win", { a: "valid", b: "valid" })),
    ...Array.from({ length: 2 }, (_, i) => t(35 + i, "Loss", { a: "valid", b: "invalid" })),
    ...Array.from({ length: 4 }, (_, i) => t(30 + i, "Loss", { a: "invalid", b: "invalid" })),
  ];
  const p = buildProfile(trades);
  it("finds the steps that separate winners from losers", () => {
    const a = p.steps.find((s) => s.key === "a")!;
    expect(a.withWR).toBeCloseTo(6 / 8);
    expect(a.withoutWR).toBe(0);
    expect(a.lift).toBeGreaterThan(0);
  });
  it("skips steps without enough trades on both sides", () => {
    expect(buildProfile([t(40, "Win", { z: "valid" })]).steps).toEqual([]);
  });
  it("compares fully proven trades with the rest", () => {
    expect(p.proven.n).toBe(6);
    expect(p.proven.wr).toBe(1);
    expect(p.other.wr).toBe(0);
  });
  it("scores how much of the profile is currently backed by valid proof", () => {
    expect(matchScore(p, { a: "valid", b: "valid" })).toBe(100);
    expect(matchScore(p, { a: null, b: null })).toBe(0);
    const some = matchScore(p, { a: "valid", b: "invalid" })!;
    expect(some).toBeGreaterThan(0);
    expect(some).toBeLessThan(100);
  });
  it("returns nothing when the profile has no weight", () => {
    expect(matchScore({ trades: 0, steps: [], proven: { wr: 0, n: 0 }, other: { wr: 0, n: 0 } }, { a: "valid" })).toBeNull();
  });
});

describe("verdicts", () => {
  it("lets the trader's own call win", () => {
    expect(effective({ ai_verdict: "invalid", user_verdict: "valid" })).toBe("valid");
    expect(effective({ ai_verdict: "invalid", user_verdict: null })).toBe("invalid");
    expect(effective({})).toBeNull();
  });
  it("treats any valid screenshot as proof of the step", () => {
    expect(stepVerdict([{ ai_verdict: "invalid" }, { ai_verdict: "valid" }])).toBe("valid");
    expect(stepVerdict([{ ai_verdict: "invalid" }, { ai_verdict: "unclear" }])).toBe("invalid");
    expect(stepVerdict([{ ai_verdict: "unclear" }])).toBe("unclear");
    expect(stepVerdict([])).toBeNull();
  });
});

describe("reading the model's reply", () => {
  it("parses clean JSON", () => {
    expect(parseVerdict('{"verdict":"valid","confidence":0.82,"reason":"The 4H low is swept."}')).toEqual({ verdict: "valid", confidence: 0.82, reason: "The 4H low is swept." });
  });
  it("copes with thinking blocks and code fences", () => {
    expect(parseVerdict('<think>hmm</think>```json\n{"verdict":"unclear","confidence":0.3,"reason":"Timeframe not visible."}\n```')?.verdict).toBe("unclear");
  });
  it("clamps confidence and rejects unknown verdicts", () => {
    expect(parseVerdict('{"verdict":"valid","confidence":7,"reason":"x"}')?.confidence).toBe(1);
    expect(parseVerdict('{"verdict":"buy now","confidence":1,"reason":"x"}')).toBeNull();
    expect(parseVerdict("no json here")).toBeNull();
  });
});
