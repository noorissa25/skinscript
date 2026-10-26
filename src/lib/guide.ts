import { ingredients, rules, sourceById } from "./knowledge";
import type { CombinationRule, CountRule, Ingredient, Source, Tag } from "./types";

/** Human labels for rule tags, used by the conflict guide and spotlight cards. */
export const TAG_LABELS: Partial<Record<Tag, string>> = {
  retinoid: "Retinoids",
  "light-sensitive-retinoid": "Tretinoin",
  aha: "AHAs",
  bha: "BHAs",
  pha: "PHAs",
  "benzoyl-peroxide": "Benzoyl peroxide",
  "vitamin-c-laa": "Vitamin C (L-ascorbic acid)",
  fragrance: "Fragrance",
  "fragrance-allergen": "Labeled fragrance allergens",
  "essential-oil": "Essential oils",
  isothiazolinone: "MI / MCI",
  "formaldehyde-releaser": "Formaldehyde releasers",
  "contact-allergen": "Known contact allergens",
};

export function groupLabel(tags: Tag[]): string {
  if (tags.length === 3 && ["aha", "bha", "pha"].every((t) => tags.includes(t as Tag))) {
    return "Exfoliating acids";
  }
  return tags.map((t) => TAG_LABELS[t] ?? t).join(" / ");
}

function countSides(tags: Tag[]): string[] {
  const one = groupLabel(tags).replace(/s$/, "");
  return [one, `another ${one.toLowerCase()}`];
}

export interface GuideEntry {
  id: string;
  title: string;
  severity: "caution" | "info";
  sides: string[];
  explanation: string;
  suggestion: string;
  sources: Source[];
}

/** Pairing and stacking rules, shaped for the conflict guide. */
export function conflictGuide(): GuideEntry[] {
  return rules
    .filter((r): r is CombinationRule | CountRule => r.kind === "combination" || r.kind === "count")
    .map((r) => ({
      id: r.id,
      title: r.title,
      severity: r.severity,
      sides: r.kind === "combination" ? r.groups.map(groupLabel) : countSides(r.tags),
      explanation: r.explanation,
      suggestion: r.suggestion,
      sources: r.sources.map((id) => sourceById.get(id)!),
    }));
}

export interface Spotlight {
  ingredient: Ingredient;
  badge: string;
  watchWith: string[];
  sourceCount: number;
}

const BADGES: Partial<Record<Tag, string>> = {
  retinoid: "Retinoid",
  aha: "AHA",
  bha: "BHA",
  pha: "PHA",
  "vitamin-c-laa": "Antioxidant",
  "benzoyl-peroxide": "Acne care",
  fragrance: "Fragrance",
  "fragrance-allergen": "Fragrance allergen",
  isothiazolinone: "Preservative",
  "formaldehyde-releaser": "Preservative",
};

export function spotlight(ids: string[]): Spotlight[] {
  return ids.map((id) => {
    const ingredient = ingredients.find((i) => i.id === id);
    if (!ingredient) throw new Error(`Unknown spotlight ingredient "${id}"`);
    const tags = new Set(ingredient.tags);
    const watchWith = rules
      .filter((r) => (r.kind === "combination" ? r.groups.flat() : r.tags).some((t) => tags.has(t)))
      .map((r) => r.title);
    const badge = ingredient.tags.map((t) => BADGES[t]).find(Boolean) ?? ingredient.functions[0];
    return { ingredient, badge, watchWith, sourceCount: ingredient.sources.length };
  });
}
