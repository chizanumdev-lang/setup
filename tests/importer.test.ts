import { describe, expect, it } from "vitest";
import { buildExport, parseImport, toCsv } from "@/lib/importer";
import type { Trade } from "@/lib/format";

const trade = (over: Partial<Trade> = {}): Trade => ({
  id: "11111111-1111-4111-8111-111111111111", taken_at: "2025-01-06T14:30:00.000Z", instrument: "NQ", direction: "bull", session: "New York", entry_type: "Reversal",
  checklist_version: 1, checklist_snapshot: { name: "Candle Three" }, ticks: { dol: true }, status: "valid", entry: 100, stop: 99, target: 102,
  outcome: "Win", r_result: 2, notes_pre: 'said "go"', notes_post: null, tags: ["A+ setup", "news"], ...over,
});

describe("export", () => {
  it("writes CSV with quoting", () => {
    const csv = toCsv([trade()]);
    const [head, row] = csv.split("\n");
    expect(head.startsWith("id,taken_at_utc,instrument")).toBe(true);
    expect(row).toContain('"said ""go"""');
    expect(row).toContain("A+ setup; news");
    expect(row).toContain(",long,");
  });
});

describe("import", () => {
  const file = (trades: unknown[]) => JSON.stringify({ app: "candle-three", version: 1, exported_at: "", trades, strategies: [] });

  it("round-trips an export", () => {
    const p = parseImport(JSON.stringify(buildExport([trade()], [])), "u1");
    expect(p.error).toBeUndefined();
    expect(p.rows).toHaveLength(1);
    expect(p.rows[0]).toMatchObject({ user_id: "u1", instrument: "NQ", outcome: "Win", r_result: 2 });
  });
  it("rejects files that are not exports", () => {
    expect(parseImport("not json", "u").error).toMatch(/valid JSON/);
    expect(parseImport(JSON.stringify({ trades: [] }), "u").error).toMatch(/Candle Three export/);
  });
  it("rejects exports from a newer version", () => {
    expect(parseImport(JSON.stringify({ app: "candle-three", version: 99, trades: [] }), "u").error).toMatch(/newer/);
  });
  it("skips invalid rows and keeps the good ones", () => {
    const p = parseImport(file([trade(), trade({ direction: "sideways" as never }), trade({ taken_at: "nonsense" }), { nothing: true }]), "u");
    expect(p.rows).toHaveLength(1);
    expect(p.skipped).toBe(3);
  });
  it("always writes rows for the importing user, never the original owner", () => {
    const p = parseImport(file([{ ...trade(), user_id: "someone-else" }]), "me");
    expect(p.rows[0].user_id).toBe("me");
  });
  it("normalises instrument case and drops unknown sessions", () => {
    const p = parseImport(file([trade({ instrument: " nq ", session: "Mars" })]), "u");
    expect(p.rows[0]).toMatchObject({ instrument: "NQ", session: null });
  });
});
