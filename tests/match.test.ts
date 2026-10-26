import { describe, expect, it } from "vitest";
import { editDistance, fuzzyLookup, matchIngredient } from "@/lib/match";
import { parseIngredientList } from "@/lib/parse";

function match(text: string) {
  const [parsed] = parseIngredientList(text);
  return matchIngredient(parsed, "Test", 1);
}

describe("editDistance", () => {
  it("computes Levenshtein distance", () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("same", "same")).toBe(0);
  });

  it("exits early past the limit", () => {
    expect(editDistance("abcdefgh", "zzzzzzzz", 2)).toBe(3);
  });
});

describe("matchIngredient", () => {
  it("matches the INCI name exactly", () => {
    expect(match("Glycerin").match).toMatchObject({ method: "exact", ingredient: { id: "glycerin" } });
  });

  it("matches common names and synonyms as aliases", () => {
    expect(match("Hyaluronic Acid").match).toMatchObject({ method: "alias", ingredient: { id: "sodium-hyaluronate" } });
    expect(match("Avobenzone").match?.ingredient.id).toBe("avobenzone");
  });

  it("uses the parenthetical name when the outer name is unknown", () => {
    expect(match("Butyrospermum Parkii (Shea) Butter").match?.ingredient.id).toBe("shea-butter");
    expect(match("Mystery Botanical (Water)").match?.ingredient.id).toBe("water");
  });

  it("recovers from small OCR errors with a fuzzy match", () => {
    const m = match("Niacinamlde").match;
    expect(m).toMatchObject({ method: "fuzzy", distance: 1, ingredient: { id: "niacinamide" } });
  });

  it("does not fuzzy-match short names", () => {
    expect(match("Aqux").match).toBeNull();
  });

  it("leaves unknown ingredients unmatched", () => {
    expect(match("Ethoxydiglycol").match).toBeNull();
  });
});

describe("fuzzyLookup", () => {
  it("refuses to guess between two different ingredients at the same distance", () => {
    // "retinxl" is one edit from both "retinol" and "retinal".
    expect(fuzzyLookup("retinxl")).toBeNull();
  });
});

describe("real-label names", () => {
  it("matches multilingual slash names through their parts", () => {
    expect(match("AQUA/WATER/EAU").match?.ingredient.id).toBe("water");
    expect(match("BUTYROSPERMUM PARKII BUTTER/SHEA BUTTER").match?.ingredient.id).toBe("shea-butter");
  });

  it("still matches Caprylic/Capric Triglyceride as one ingredient", () => {
    expect(match("Caprylic/Capric Triglyceride").match).toMatchObject({ method: "exact", ingredient: { id: "caprylic-capric-triglyceride" } });
  });
});
