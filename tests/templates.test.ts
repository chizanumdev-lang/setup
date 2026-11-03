import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/lib/templates";
import { analyze, sw, statusOf } from "@/lib/checklist";

describe.each(TEMPLATES)("template: $name", (t) => {
  const a = analyze(t.steps);
  const all = t.steps.flatMap((s) => s.items);

  it("has unique item keys", () => {
    const keys = all.map((i) => i[0]);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("can become valid: at least one required item", () => expect(a.req.length).toBeGreaterThan(0));
  it("has a no-go list, and every no-go item is level 2", () => {
    const stop = t.steps.filter((s) => s.stop);
    expect(stop.length).toBe(1);
    stop[0].items.forEach((i) => expect(i[3]).toBe(2));
    expect(a.nogo.length).toBeGreaterThan(0);
  });
  it("every section has a title and items, and every item has a title", () => {
    t.steps.forEach((s) => { expect(s.title.trim()).not.toBe(""); expect(s.items.length).toBeGreaterThan(0); });
    all.forEach((i) => expect(i[1].trim()).not.toBe(""));
  });
  it("uses only valid levels", () => all.forEach((i) => expect([0, 1, 2]).toContain(i[3])));
  it("works with the status logic", () => {
    expect(statusOf({}, t.steps)).toBe("incomplete");
    expect(statusOf(Object.fromEntries(a.req.map((k) => [k, true])), t.steps)).toBe("valid");
    expect(statusOf({ ...Object.fromEntries(a.req.map((k) => [k, true])), [a.nogo[0]]: true }, t.steps)).toBe("no_trade");
  });
  it("reads cleanly in both biases: balanced braces, no leftover pipes, no long dashes", () => {
    for (const bias of ["bull", "bear"] as const) {
      all.forEach(([, title, desc]) => {
        for (const text of [sw(title, bias), sw(desc, bias)]) {
          expect(text).not.toMatch(/[{}|]/);
          expect(text).not.toMatch(/[—–]/);
        }
      });
    }
    all.forEach(([, title, desc]) => { expect((title + desc).match(/\{/g)?.length ?? 0).toBe((title + desc).match(/\}/g)?.length ?? 0); });
  });
});
