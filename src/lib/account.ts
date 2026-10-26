import type { Analysis } from "./types";

export interface CheckSummary {
  recognized: number;
  total: number;
  findings: { id: string; title: string; severity: "caution" | "info" }[];
}

export interface SavedProduct {
  name: string;
  text: string;
}

export interface SharedCheck {
  title: string;
  findings: { title: string; severity: "caution" | "info" }[];
}

export const CHAT_MAX_LENGTH = 500;
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 30;

export function summarize(analysis: Analysis): CheckSummary {
  return {
    recognized: analysis.stats.recognized,
    total: analysis.stats.total,
    findings: analysis.findings.map((f) => ({ id: f.ruleId, title: f.title, severity: f.severity })),
  };
}

/** A default title for a saved check: the product names, shortened. */
export function checkTitle(products: SavedProduct[]): string {
  const title = products.map((p) => p.name.trim()).filter(Boolean).join(" + ");
  return title.length > 120 ? `${title.slice(0, 119)}…` : title || "Untitled check";
}

/**
 * What goes into the chat when someone shares a result: product names and
 * flag titles only. Never the ingredient text, matched positions or notes.
 */
export function shareCard(products: SavedProduct[], analysis: Analysis): SharedCheck {
  return {
    title: checkTitle(products),
    findings: analysis.findings.map((f) => ({ title: f.title, severity: f.severity })),
  };
}

/** Ingredients in this analysis that the person has on their avoid list, by product. */
export function avoidMatches(analysis: Analysis, avoidIds: ReadonlySet<string>) {
  const matches: { product: string; name: string; ingredientId: string }[] = [];
  for (const p of analysis.products) {
    for (const m of p.ingredients) {
      if (m.match && avoidIds.has(m.match.ingredient.id)) {
        matches.push({ product: p.name, name: m.raw, ingredientId: m.match.ingredient.id });
      }
    }
  }
  return matches;
}

export function validDisplayName(name: string) {
  const trimmed = name.trim();
  return trimmed.length >= DISPLAY_NAME_MIN && trimmed.length <= DISPLAY_NAME_MAX;
}

export function validChatBody(body: string) {
  const trimmed = body.trim();
  return trimmed.length >= 1 && trimmed.length <= CHAT_MAX_LENGTH;
}
