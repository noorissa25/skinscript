import { describe, expect, it } from "vitest";
import { analyzeProducts } from "@/lib/analyze";
import { samples } from "@/lib/samples";

const ruleIds = (...texts: string[]) =>
  analyzeProducts(texts.map((text, i) => ({ name: `P${i + 1}`, text }))).findings.map((f) => f.ruleId);

describe("combination rules", () => {
  it("flags a retinoid with an AHA, BHA or PHA", () => {
    expect(ruleIds("Water, Retinol, Glycolic Acid")).toContain("retinoid-plus-exfoliating-acid");
    expect(ruleIds("Water, Adapalene, Salicylic Acid")).toContain("retinoid-plus-exfoliating-acid");
    expect(ruleIds("Water, Retinal, Gluconolactone")).toContain("retinoid-plus-exfoliating-acid");
  });

  it("flags combinations across products in a routine", () => {
    const analysis = analyzeProducts([
      { name: "Serum", text: "Water, Retinol" },
      { name: "Toner", text: "Water, Lactic Acid" },
    ]);
    const finding = analysis.findings.find((f) => f.ruleId === "retinoid-plus-exfoliating-acid");
    expect(finding?.sameProduct).toBe(false);
    expect(finding?.evidence.map((g) => g.map((h) => h.product))).toEqual([["Serum"], ["Toner"]]);
  });

  it("marks a combination inside one product as same-product", () => {
    const analysis = analyzeProducts([{ name: "Gel", text: "Water, Adapalene, Benzoyl Peroxide" }]);
    expect(analysis.findings.find((f) => f.ruleId === "retinoid-plus-benzoyl-peroxide")?.sameProduct).toBe(true);
  });

  it("flags tretinoin + benzoyl peroxide stability, but not adapalene", () => {
    expect(ruleIds("Tretinoin", "Benzoyl Peroxide")).toContain("tretinoin-plus-benzoyl-peroxide");
    expect(ruleIds("Adapalene", "Benzoyl Peroxide")).not.toContain("tretinoin-plus-benzoyl-peroxide");
  });

  it("flags L-ascorbic acid + benzoyl peroxide, but not stable vitamin C derivatives", () => {
    expect(ruleIds("Water, Ascorbic Acid", "Benzoyl Peroxide")).toContain("vitamin-c-plus-benzoyl-peroxide");
    expect(ruleIds("Water, Sodium Ascorbyl Phosphate", "Benzoyl Peroxide")).not.toContain(
      "vitamin-c-plus-benzoyl-peroxide",
    );
  });

  it("does not treat look-alikes as actives", () => {
    const ids = ruleIds("Water, Bakuchiol, Citric Acid, Salix Alba Bark Extract, Benzyl Salicylate, Ethylhexyl Salicylate");
    expect(ids).not.toContain("retinoid-plus-exfoliating-acid");
    expect(ids).not.toContain("multiple-exfoliating-acids");
    expect(ids).not.toContain("sun-sensitivity");
  });
});

describe("count and presence rules", () => {
  it("needs two different exfoliating acids for the multiple-acid flag", () => {
    expect(ruleIds("Glycolic Acid, Lactic Acid")).toContain("multiple-exfoliating-acids");
    expect(ruleIds("Glycolic Acid", "Glycolic Acid")).not.toContain("multiple-exfoliating-acids");
  });

  it("flags sun sensitivity and pregnancy for retinoids", () => {
    const ids = ruleIds("Water, Retinol");
    expect(ids).toEqual(expect.arrayContaining(["sun-sensitivity", "retinoid-pregnancy"]));
  });

  it("flags fragrance, essential oils and labeled fragrance allergens together", () => {
    const analysis = analyzeProducts([{ name: "P", text: "Water, Parfum, Linalool, Lavandula Angustifolia Oil" }]);
    const fragrance = analysis.findings.find((f) => f.ruleId === "fragrance");
    expect(fragrance?.evidence[0].map((h) => h.name)).toEqual(["Parfum", "Linalool", "Lavandula Angustifolia Oil"]);
  });

  it("flags MI and formaldehyde releasers", () => {
    expect(ruleIds("Water, Methylisothiazolinone, DMDM Hydantoin")).toEqual(
      expect.arrayContaining(["isothiazolinone", "formaldehyde-releaser"]),
    );
  });

  it("returns no findings for a plain moisturizer", () => {
    const sample = samples.find((s) => s.id === "gentle-moisturizer")!;
    expect(analyzeProducts(sample.products).findings).toEqual([]);
  });

  it("sorts caution findings before info", () => {
    const { findings } = analyzeProducts([{ name: "P", text: "Retinol, Glycolic Acid, Parfum" }]);
    const firstInfo = findings.findIndex((f) => f.severity === "info");
    expect(findings.slice(firstInfo).every((f) => f.severity === "info")).toBe(true);
  });
});

describe("notes", () => {
  it("notes when an active is listed near the end of a long list", () => {
    const text = "Water, Glycerin, Squalane, Dimethicone, Cetyl Alcohol, Carbomer, Xanthan Gum, Phenoxyethanol, Retinol";
    const analysis = analyzeProducts([{ name: "A", text }, { name: "B", text: "Glycolic Acid" }]);
    const finding = analysis.findings.find((f) => f.ruleId === "retinoid-plus-exfoliating-acid")!;
    expect(finding.evidence[0][0].lowInList).toBe(true);
    expect(finding.notes.join(" ")).toMatch(/small amount/);
  });

  it("notes when a flag depends on a fuzzy match", () => {
    const finding = analyzeProducts([{ name: "A", text: "Water, Methylisothiazolinome" }]).findings.find(
      (f) => f.ruleId === "isothiazolinone",
    )!;
    expect(finding.notes.join(" ")).toMatch(/not exact/);
  });
});

describe("samples", () => {
  it("each real-product sample produces the flags it is meant to show", () => {
    const byId = Object.fromEntries(samples.map((s) => [s.id, analyzeProducts(s.products)]));
    expect(byId["routine-retinol-aha"].findings.map((f) => f.ruleId)).toContain("retinoid-plus-exfoliating-acid");
    expect(byId["routine-retinoid-bha"].findings.map((f) => f.ruleId)).toEqual(
      expect.arrayContaining(["retinoid-plus-exfoliating-acid", "fragrance"]),
    );
    expect(byId["ocr-messy"].stats.fuzzy).toBeGreaterThan(0);
    expect(byId["ocr-messy"].stats.recognized).toBe(byId["ocr-messy"].stats.total);
  });

  it("recognizes every ingredient in the real-product samples", () => {
    for (const s of samples) {
      const { stats } = analyzeProducts(s.products);
      expect(stats.recognized, s.id).toBe(stats.total);
    }
  });

  it("cites a source for every sample product", () => {
    for (const s of samples) for (const p of s.products) expect(p.source.url, p.name).toMatch(/^https:\/\//);
  });
});
