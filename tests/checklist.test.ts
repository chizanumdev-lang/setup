import { describe, expect, it } from "vitest";
import { BUILTIN, analyze, legLabel, snapshot, statusOf, stepsFromSnapshot, sw, type Step } from "@/lib/checklist";

const all = analyze(BUILTIN.steps);
const custom: Step[] = [
  { id: "s1", title: "London range", tf: "15m", goal: "", items: [["a", "Asian range marked", "", 1], ["b", "News checked", "", 0]] },
  { id: "x", title: "Skip the trade if…", tf: "No-go", goal: "", stop: true, items: [["n", "FOMC today", "", 2]] },
];

describe("built-in strategy", () => {
  it("has 11 required and 5 no-go items", () => {
    expect(all.req).toHaveLength(11);
    expect(all.nogo).toHaveLength(5);
  });
  it("is incomplete until every required item is ticked", () => {
    expect(statusOf({}, BUILTIN.steps)).toBe("incomplete");
    const some = Object.fromEntries(all.req.slice(0, 5).map((k) => [k, true]));
    expect(statusOf(some, BUILTIN.steps)).toBe("incomplete");
  });
  it("is valid with all required ticked", () => {
    expect(statusOf(Object.fromEntries(all.req.map((k) => [k, true])), BUILTIN.steps)).toBe("valid");
  });
  it("a ticked no-go item always wins", () => {
    const ticks = { ...Object.fromEntries(all.req.map((k) => [k, true])), x1: true };
    expect(statusOf(ticks, BUILTIN.steps)).toBe("no_trade");
  });
});

describe("custom strategies", () => {
  it("one required item is enough to be valid", () => expect(statusOf({ a: true }, custom)).toBe("valid"));
  it("no-go cancels", () => expect(statusOf({ a: true, n: true }, custom)).toBe("no_trade"));
  it("a strategy with no required items can never be valid", () => {
    expect(statusOf({ z: true }, [{ id: "s", title: "t", tf: "", goal: "", items: [["z", "only optional", "", 0]] }])).toBe("incomplete");
  });
  it("labels legs for the run bar", () => {
    expect(legLabel(custom[0])).toBe("15m");
    expect(legLabel({ ...custom[0], tf: "1D + 1H" })).toBe("Londo");
  });
});

describe("snapshots", () => {
  it("round-trip through JSON", () => {
    const back = stepsFromSnapshot(JSON.parse(JSON.stringify(snapshot({ id: "x", name: "London", version: 3, steps: custom }))));
    expect(back.name).toBe("London");
    expect(back.version).toBe(3);
    expect(back.steps).toHaveLength(2);
  });
  it("reads the older flat shape", () => {
    const old = stepsFromSnapshot({ name: "Candle Three", version: 1, items: [{ key: "dol", title: "Draw", level: 1 }] });
    expect(analyze(old.steps).req).toEqual(["dol"]);
  });
  it("falls back to the built-in strategy when there is no snapshot", () => {
    expect(stepsFromSnapshot(null).name).toBe("Candle Three");
  });
});

describe("bullish and bearish wording", () => {
  it("swaps the {a|b} pairs", () => {
    expect(sw("sweeps the {low|high}", "bull")).toBe("sweeps the low");
    expect(sw("sweeps the {low|high}", "bear")).toBe("sweeps the high");
  });
});
