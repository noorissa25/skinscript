import ingredientsJson from "../../data/ingredients.json";
import rulesJson from "../../data/rules.json";
import sourcesJson from "../../data/sources.json";
import type { Ingredient, Rule, Source } from "./types";
import { normalizeName } from "./parse";

export const ingredients = ingredientsJson as Ingredient[];
export const rules = rulesJson as Rule[];
export const sources = sourcesJson as Source[];

export const sourceById = new Map(sources.map((s) => [s.id, s]));

/** Every normalized name (INCI and aliases) mapped to its ingredient. */
export const nameIndex: Map<string, { ingredient: Ingredient; isInci: boolean }> = (() => {
  const index = new Map<string, { ingredient: Ingredient; isInci: boolean }>();
  for (const ingredient of ingredients) {
    index.set(normalizeName(ingredient.inci), { ingredient, isInci: true });
    for (const alias of ingredient.aliases) {
      const key = normalizeName(alias);
      if (!index.has(key)) index.set(key, { ingredient, isInci: false });
    }
  }
  return index;
})();
