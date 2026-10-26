export type Tag =
  | "retinoid"
  | "light-sensitive-retinoid"
  | "pregnancy-caution"
  | "aha"
  | "bha"
  | "pha"
  | "benzoyl-peroxide"
  | "vitamin-c-laa"
  | "vitamin-c-derivative"
  | "fragrance"
  | "fragrance-allergen"
  | "essential-oil"
  | "isothiazolinone"
  | "formaldehyde-releaser"
  | "contact-allergen"
  | "uv-filter"
  | "ph-adjuster";

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  /** What this source is cited for in the repo. */
  supports: string;
}

export interface Ingredient {
  id: string;
  inci: string;
  aliases: string[];
  functions: string[];
  description: string;
  tags: Tag[];
  sources: string[];
}

export type Severity = "caution" | "info";

interface RuleBase {
  id: string;
  severity: Severity;
  title: string;
  explanation: string;
  suggestion: string;
  sources: string[];
}

/** Fires when every group has at least one matching ingredient. */
export interface CombinationRule extends RuleBase {
  kind: "combination";
  groups: Tag[][];
}

/** Fires when at least `min` distinct ingredients carry one of `tags`. */
export interface CountRule extends RuleBase {
  kind: "count";
  tags: Tag[];
  min: number;
}

/** Fires when any ingredient carries one of `tags`. */
export interface PresenceRule extends RuleBase {
  kind: "presence";
  tags: Tag[];
}

export type Rule = CombinationRule | CountRule | PresenceRule;

export type MatchMethod = "exact" | "alias" | "fuzzy";

export interface ParsedIngredient {
  /** Text as it appeared after cleanup, e.g. "Aqua (Water)". */
  raw: string;
  /** Lowercased, punctuation-normalized key used for lookup. */
  normalized: string;
  /** Alternate names found in parentheses, normalized. */
  alternates: string[];
  /** 1-based position in the list. */
  position: number;
}

export interface MatchedIngredient extends ParsedIngredient {
  product: string;
  /** Total ingredients in this product's list, for position context. */
  total: number;
  match: {
    ingredient: Ingredient;
    method: MatchMethod;
    /** Edit distance for fuzzy matches, 0 otherwise. */
    distance: number;
    matchedOn: string;
  } | null;
}

export interface Hit {
  product: string;
  name: string;
  ingredientId: string;
  position: number;
  total: number;
  /** In the last third of a list with at least 9 entries; likely a small amount. */
  lowInList: boolean;
}

export interface Finding {
  ruleId: string;
  kind: Rule["kind"];
  severity: Severity;
  title: string;
  explanation: string;
  suggestion: string;
  sources: Source[];
  /** For combination rules, one array per group; otherwise a single array. */
  evidence: Hit[][];
  /** Combination found within one product rather than across products. */
  sameProduct?: boolean;
  notes: string[];
}

export interface ProductInput {
  name: string;
  text: string;
}

export interface Analysis {
  products: {
    name: string;
    ingredients: MatchedIngredient[];
    unrecognized: string[];
  }[];
  findings: Finding[];
  stats: {
    total: number;
    recognized: number;
    fuzzy: number;
  };
  disclaimer: string;
}
