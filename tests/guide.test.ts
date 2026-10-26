import { describe, expect, it } from "vitest";
import { conflictGuide, groupLabel, spotlight } from "@/lib/guide";

describe("conflict guide", () => {
  it("lists every pairing and stacking rule with two labeled sides and sources", () => {
    const guide = conflictGuide();
    expect(guide.map((g) => g.id)).toEqual(
      expect.arrayContaining(["retinoid-plus-exfoliating-acid", "vitamin-c-plus-benzoyl-peroxide", "multiple-exfoliating-acids"]),
    );
    for (const entry of guide) {
      expect(entry.sides).toHaveLength(2);
      expect(entry.sides.every((s) => s.length > 0)).toBe(true);
      expect(entry.sources.length).toBeGreaterThan(0);
    }
  });

  it("names the AHA/BHA/PHA group in plain words", () => {
    expect(groupLabel(["aha", "bha", "pha"])).toBe("Exfoliating acids");
    expect(groupLabel(["benzoyl-peroxide"])).toBe("Benzoyl peroxide");
  });
});

describe("spotlight", () => {
  it("builds cards with a badge, the rules they can trigger and a source count", () => {
    const [retinol] = spotlight(["retinol"]);
    expect(retinol.badge).toBe("Retinoid");
    expect(retinol.watchWith).toContain("Retinoid + exfoliating acid");
    expect(retinol.sourceCount).toBeGreaterThan(0);
  });

  it("fails loudly on an unknown ingredient id", () => {
    expect(() => spotlight(["not-real"])).toThrow(/Unknown spotlight ingredient/);
  });
});
