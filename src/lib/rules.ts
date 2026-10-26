import { rules as allRules, sourceById } from "./knowledge";
import type { Finding, Hit, MatchedIngredient, Rule, Source, Tag } from "./types";

const LOW_IN_LIST_MIN_TOTAL = 9;

function toHit(m: MatchedIngredient): Hit {
  return {
    product: m.product,
    name: m.raw,
    ingredientId: m.match!.ingredient.id,
    position: m.position,
    total: m.total,
    lowInList: m.total >= LOW_IN_LIST_MIN_TOTAL && m.position > (m.total * 2) / 3,
  };
}

function hitsFor(items: MatchedIngredient[], tags: Tag[]): Hit[] {
  const wanted = new Set(tags);
  return items
    .filter((m) => m.match && m.match.ingredient.tags.some((t) => wanted.has(t)))
    .map(toHit);
}

function resolveSources(ids: string[]): Source[] {
  return ids.map((id) => {
    const source = sourceById.get(id);
    if (!source) throw new Error(`Unknown source id "${id}"`);
    return source;
  });
}

function notesFor(rule: Rule, evidence: Hit[][], items: MatchedIngredient[]): string[] {
  const notes: string[] = [];
  const all = evidence.flat();
  if (evidence.some((group) => group.length > 0 && group.every((h) => h.lowInList))) {
    notes.push(
      rule.kind === "combination"
        ? "One side of this pairing is listed near the end of its ingredient list, so it may be present in a small amount."
        : "These are listed near the end of the ingredient list, so they may be present in small amounts.",
    );
  }
  const fuzzy = all.filter((h) =>
    items.some((m) => m.product === h.product && m.position === h.position && m.match?.method === "fuzzy"),
  );
  if (fuzzy.length > 0) {
    notes.push(
      `Matched from a spelling that was not exact (${fuzzy.map((h) => `"${h.name}"`).join(", ")}). Check the label to confirm.`,
    );
  }
  return notes;
}

/**
 * Evaluate every curated rule against the matched ingredients of one or more
 * products. Combination rules can be satisfied across products, which is how
 * routine-level conflicts (retinol serum + glycolic toner) are caught.
 */
export function evaluateRules(items: MatchedIngredient[], rules: Rule[] = allRules): Finding[] {
  const findings: Finding[] = [];

  for (const rule of rules) {
    let evidence: Hit[][] | null = null;
    let sameProduct: boolean | undefined;

    if (rule.kind === "combination") {
      const groups = rule.groups.map((tags) => hitsFor(items, tags));
      if (groups.every((g) => g.length > 0)) {
        // The same ingredient cannot satisfy two groups on its own.
        const distinct = new Set(groups.flat().map((h) => `${h.product}#${h.position}`));
        if (distinct.size >= groups.length) {
          evidence = groups;
          const products = groups.map((g) => new Set(g.map((h) => h.product)));
          sameProduct = [...products[0]].some((p) => products.every((set) => set.has(p)));
        }
      }
    } else if (rule.kind === "count") {
      const hits = hitsFor(items, rule.tags);
      const distinctIngredients = new Set(hits.map((h) => h.ingredientId));
      if (distinctIngredients.size >= rule.min) evidence = [hits];
    } else {
      const hits = hitsFor(items, rule.tags);
      if (hits.length > 0) evidence = [hits];
    }

    if (!evidence) continue;
    findings.push({
      ruleId: rule.id,
      kind: rule.kind,
      severity: rule.severity,
      title: rule.title,
      explanation: rule.explanation,
      suggestion: rule.suggestion,
      sources: resolveSources(rule.sources),
      evidence,
      sameProduct,
      notes: notesFor(rule, evidence, items),
    });
  }

  const order = { caution: 0, info: 1 } as const;
  return findings.sort((a, b) => order[a.severity] - order[b.severity]);
}
