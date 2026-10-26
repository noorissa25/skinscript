import { matchIngredient } from "./match";
import { parseIngredientList } from "./parse";
import { evaluateRules } from "./rules";
import type { Analysis, ProductInput } from "./types";

export const DISCLAIMER =
  "This tool explains ingredients using a small curated, cited knowledge base. It is not medical advice and cannot tell you how a product will affect your skin. Ingredient lists do not show amounts, so flags are general cautions. For skin conditions, pregnancy, allergies or prescription products, talk to a dermatologist or pharmacist.";

export const MAX_PRODUCTS = 4;
export const MAX_TEXT_LENGTH = 10_000;

export function analyzeProducts(products: ProductInput[]): Analysis {
  const used = new Set<string>();
  const analyzed = products.filter((p) => p.text.trim()).map((product, i) => {
    let name = product.name.trim() || `Product ${i + 1}`;
    // Names identify products in findings, so they must be unique.
    if (used.has(name)) name = `${name} (${i + 1})`;
    used.add(name);
    const parsed = parseIngredientList(product.text);
    const ingredients = parsed.map((p) => matchIngredient(p, name, parsed.length));
    return {
      name,
      ingredients,
      unrecognized: ingredients.filter((m) => !m.match).map((m) => m.raw),
    };
  });

  const all = analyzed.flatMap((p) => p.ingredients);
  return {
    products: analyzed,
    findings: evaluateRules(all),
    stats: {
      total: all.length,
      recognized: all.filter((m) => m.match).length,
      fuzzy: all.filter((m) => m.match?.method === "fuzzy").length,
    },
    disclaimer: DISCLAIMER,
  };
}
