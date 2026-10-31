import { describe, expect, it } from "vitest";
import { build, termSpec } from "@/lib/chartData";
import { DIAG } from "@/lib/diagram";

describe("term charts", () => {
  it("builds every term for both biases", () => {
    DIAG.forEach((d, i) => {
      if (d.smt) return;
      for (const bias of ["bull", "bear"] as const) {
        const t = termSpec(i);
        const b = build(t.spec, t.lead, t.seed, bias);
        expect(b.bars.length).toBe(t.spec.c.length + 8);
        b.bars.forEach((x) => { expect(x.high).toBeGreaterThanOrEqual(Math.max(x.open, x.close) - 1e-9); expect(x.low).toBeLessThanOrEqual(Math.min(x.open, x.close) + 1e-9); });
      }
    });
  });
  it("is deterministic", () => {
    const t = termSpec(0);
    expect(build(t.spec, t.lead, t.seed, "bull")).toEqual(build(t.spec, t.lead, t.seed, "bull"));
  });
  it("mirrors the bearish chart around the same pattern", () => {
    const t = termSpec(0);
    const bull = build(t.spec, t.lead, t.seed, "bull"), bear = build(t.spec, t.lead, t.seed, "bear");
    const i = bull.bars.length - 1;
    expect(bull.bars[i].high + bear.bars[i].low).toBeCloseTo(bull.bars[i].low + bear.bars[i].high, 6);
    expect(bull.bars[i].close).not.toBeCloseTo(bear.bars[i].close, 6);
  });
});
