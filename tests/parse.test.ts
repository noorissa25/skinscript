import { describe, expect, it } from "vitest";
import { normalizeName, parseIngredientList } from "@/lib/parse";

const names = (text: string) => parseIngredientList(text).map((p) => p.raw);

describe("normalizeName", () => {
  it("lowercases and unifies slashes, dashes and spacing", () => {
    expect(normalizeName("Caprylic / Capric  Triglyceride")).toBe("caprylic/capric triglyceride");
    expect(normalizeName("Ceteareth – 20")).toBe("ceteareth-20");
    expect(normalizeName("  Glycerin. ")).toBe("glycerin");
  });

  it("drops trademark symbols and footnote asterisks", () => {
    expect(normalizeName("Aloe Barbadensis Leaf Juice*")).toBe("aloe barbadensis leaf juice");
    expect(normalizeName("Granactive Retinoid®")).toBe("granactive retinoid");
  });
});

describe("parseIngredientList", () => {
  it("splits a plain comma list and strips the header", () => {
    expect(names("Ingredients: Water, Glycerin, Niacinamide.")).toEqual(["Water", "Glycerin", "Niacinamide"]);
  });

  it("ignores marketing text before the ingredients header", () => {
    expect(names("Hydrating gel for all skin types. 50 ml\nINGREDIENTS: Aqua, Glycerin")).toEqual(["Aqua", "Glycerin"]);
  });

  it("keeps commas inside parentheses and records alternates", () => {
    const [first, second] = parseIngredientList("Aqua (Water), Retinol (Vitamin A, 0.3%), Glycerin");
    expect(first.raw).toBe("Aqua (Water)");
    expect(first.alternates).toEqual(["aqua", "water"]);
    expect(second.raw).toBe("Retinol (Vitamin A)");
    expect(second.alternates).toContain("retinol");
  });

  it("keeps slashes inside names", () => {
    expect(names("Caprylic/Capric Triglyceride, Aqua/Water")).toEqual(["Caprylic/Capric Triglyceride", "Aqua/Water"]);
  });

  it("splits on semicolons, bullets and line breaks", () => {
    expect(names("Water; Glycerin • Squalane\nDimethicone · Carbomer")).toEqual([
      "Water",
      "Glycerin",
      "Squalane",
      "Dimethicone",
      "Carbomer",
    ]);
  });

  it("re-joins words hyphenated across a line break", () => {
    expect(names("Water, Phenoxy-\nethanol, Glycerin")).toEqual(["Water", "Phenoxyethanol", "Glycerin"]);
  });

  it("removes percentages", () => {
    expect(names("Niacinamide 10%, Zinc PCA 1%")).toEqual(["Niacinamide", "Zinc PCA"]);
  });

  it("handles US drug facts active/inactive sections", () => {
    expect(
      names("Active ingredient: Benzoyl Peroxide 5%. Inactive ingredients: Water, Carbomer"),
    ).toEqual(["Benzoyl Peroxide", "Water", "Carbomer"]);
  });

  it("handles 'may contain (+/-)' colorant blocks", () => {
    expect(names("Mica, Dimethicone. May contain (+/-): CI 77491, CI 77891")).toEqual([
      "Mica",
      "Dimethicone",
      "CI 77491",
      "CI 77891",
    ]);
  });

  it("drops organic footnotes, empty items and duplicates and numbers positions", () => {
    const parsed = parseIngredientList("Water,, Glycerin, water, Aloe*, *Organic ingredient");
    expect(parsed.map((p) => p.raw)).toEqual(["Water", "Glycerin", "Aloe*"]);
    expect(parsed.map((p) => p.position)).toEqual([1, 2, 3]);
  });

  it("returns nothing for empty or non-text input", () => {
    expect(parseIngredientList("")).toEqual([]);
    expect(parseIngredientList(" , ; 123 ")).toEqual([]);
  });
});

describe("parseIngredientList on OCR output", () => {
  it("stops at the paragraph after the list and skips sentences", () => {
    const ocr =
      "DAILY CLARIFYING SERUM\n\n30mL/1floz\n\nINGREDIENTS: Aqua (Water), Glycerin,\nRetinol, Limonene.\n\nSample label for testing OCR. Not a real product.";
    expect(names(ocr)).toEqual(["Aqua (Water)", "Glycerin", "Retinol", "Limonene"]);
    expect(names("Water, Glycerin, apply a small amount to clean dry skin every night")).toEqual(["Water", "Glycerin"]);
  });
});

describe("OCR-garbled headers", () => {
  it("strips INGREDlENTS / INGRED1ENTS headers", () => {
    expect(names("INGREDlENTS: Aqua/Water, Glycerin")).toEqual(["Aqua/Water", "Glycerin"]);
    expect(names("Serum 30ml INGRED1ENTS: Water")).toEqual(["Water"]);
  });
});

describe("slash-joined synonyms", () => {
  it("offers each part as a fallback but keeps the full name first", () => {
    const [p] = parseIngredientList("AQUA/WATER/EAU");
    expect(p.normalized).toBe("aqua/water/eau");
    expect(p.alternates).toEqual(expect.arrayContaining(["aqua", "water", "eau"]));
  });
});
