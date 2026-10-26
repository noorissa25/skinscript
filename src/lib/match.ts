import { nameIndex } from "./knowledge";
import type { MatchedIngredient, ParsedIngredient } from "./types";

/** Classic Levenshtein distance with an early exit once `max` is exceeded. */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, curr[j]);
    }
    if (rowMin > max) return max + 1;
    prev = curr;
  }
  return prev[b.length];
}

/** How many typos we tolerate grows with name length; short names must match exactly. */
export function fuzzyBudget(length: number): number {
  if (length < 6) return 0;
  if (length < 10) return 1;
  if (length < 18) return 2;
  return 3;
}

/**
 * Find the closest known name within the typo budget. Returns null when there
 * is no candidate or when two different ingredients tie, since guessing between
 * them (e.g. "retinal" vs "retinol") could produce a misleading flag.
 */
export function fuzzyLookup(key: string) {
  const budget = fuzzyBudget(key.length);
  if (budget === 0) return null;
  let best: { name: string; distance: number; id: string } | null = null;
  let tie = false;
  for (const [name, entry] of nameIndex) {
    const d = editDistance(key, name, budget);
    if (d > budget) continue;
    if (!best || d < best.distance) {
      best = { name, distance: d, id: entry.ingredient.id };
      tie = false;
    } else if (d === best.distance && entry.ingredient.id !== best.id) {
      tie = true;
    }
  }
  if (!best || tie) return null;
  return { ...nameIndex.get(best.name)!, name: best.name, distance: best.distance };
}

export function matchIngredient(
  parsed: ParsedIngredient,
  product: string,
  total: number,
): MatchedIngredient {
  const candidates = [parsed.normalized, ...parsed.alternates];

  for (const key of candidates) {
    const hit = nameIndex.get(key);
    if (hit) {
      return {
        ...parsed,
        product,
        total,
        match: { ingredient: hit.ingredient, method: hit.isInci ? "exact" : "alias", distance: 0, matchedOn: key },
      };
    }
  }

  for (const key of candidates) {
    const hit = fuzzyLookup(key);
    if (hit) {
      return {
        ...parsed,
        product,
        total,
        match: { ingredient: hit.ingredient, method: "fuzzy", distance: hit.distance, matchedOn: hit.name },
      };
    }
  }

  return { ...parsed, product, total, match: null };
}
