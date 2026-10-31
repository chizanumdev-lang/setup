import { afterEach, describe, expect, it } from "vitest";
import { dayKey, fromLocalInput, localInput, setTimeZone } from "@/lib/format";

afterEach(() => setTimeZone(undefined));

describe("timezone handling", () => {
  it("shows an instant in the chosen timezone", () => {
    const t = Date.UTC(2025, 0, 6, 23, 30); // 23:30 UTC
    setTimeZone("Africa/Lagos"); // UTC+1
    expect(localInput(t)).toBe("2025-01-07T00:30");
    expect(dayKey(t)).toBe("2025-01-07");
    setTimeZone("America/New_York"); // UTC-5 in January
    expect(localInput(t)).toBe("2025-01-06T18:30");
    expect(dayKey(t)).toBe("2025-01-06");
  });
  it("reads a typed wall-clock time back as the right instant", () => {
    setTimeZone("America/New_York");
    expect(new Date(fromLocalInput("2025-01-06T09:30")).toISOString()).toBe("2025-01-06T14:30:00.000Z");
    setTimeZone("Africa/Lagos");
    expect(new Date(fromLocalInput("2025-01-06T09:30")).toISOString()).toBe("2025-01-06T08:30:00.000Z");
  });
  it("handles daylight saving", () => {
    setTimeZone("America/New_York");
    expect(new Date(fromLocalInput("2025-07-01T09:30")).toISOString()).toBe("2025-07-01T13:30:00.000Z"); // UTC-4 in July
  });
  it("round-trips", () => {
    setTimeZone("Asia/Tokyo");
    const t = Date.UTC(2025, 5, 15, 3, 45);
    expect(fromLocalInput(localInput(t))).toBe(t);
  });
});
