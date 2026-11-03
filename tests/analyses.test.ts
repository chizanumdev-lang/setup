import { describe, expect, it } from "vitest";
import { mergeAnalyses, nextLabel, type Analysis, type ServerDraft } from "@/lib/analyses";

const local = (id: string, over: Partial<Analysis> = {}): Analysis => ({ id, label: id, bias: "bull", sid: null, ticks: {}, at: 1000, created: 1, synced: true, dirty: false, ...over });
const server = (id: string, over: Partial<ServerDraft> = {}): ServerDraft => ({ id, label: id, bias: "bull", ticks: {}, checklist_id: null, updated_at: new Date(1000).toISOString(), created_at: new Date(1).toISOString(), ...over });

describe("merging analyses", () => {
  it("brings in analyses started on another device", () => {
    const out = mergeAnalyses([local("a")], [server("a"), server("b")], []);
    expect(out.map((x) => x.id).sort()).toEqual(["a", "b"]);
  });
  it("keeps unsent local edits over the server copy", () => {
    const out = mergeAnalyses([local("a", { ticks: { x: true }, dirty: true, at: 500 })], [server("a", { updated_at: new Date(9000).toISOString() })], []);
    expect(out[0].ticks).toEqual({ x: true });
  });
  it("takes the newer server copy when there is nothing unsent", () => {
    const out = mergeAnalyses([local("a", { at: 1000 })], [server("a", { ticks: { y: true }, updated_at: new Date(5000).toISOString() })], []);
    expect(out[0].ticks).toEqual({ y: true });
  });
  it("drops an analysis that was finished on another device", () => {
    expect(mergeAnalyses([local("a")], [], [])).toEqual([]);
  });
  it("keeps one created here that has not been sent yet", () => {
    const out = mergeAnalyses([local("n", { synced: false, dirty: true })], [], []);
    expect(out.map((x) => x.id)).toEqual(["n"]);
  });
  it("does not bring back one this device just discarded", () => {
    expect(mergeAnalyses([], [server("a")], ["a"])).toEqual([]);
  });
  it("orders by creation time", () => {
    const out = mergeAnalyses([], [server("b", { created_at: new Date(20).toISOString() }), server("a", { created_at: new Date(10).toISOString() })], []);
    expect(out.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("labels", () => {
  it("numbers new analyses without clashing", () => {
    expect(nextLabel([])).toBe("Analysis 1");
    expect(nextLabel([local("a", { label: "Analysis 2" }), local("b", { label: "NQ" })])).toBe("Analysis 3");
  });
});
