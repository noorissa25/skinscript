import { describe, expect, it } from "vitest";
import { ingredients, rules, sourceById, sources } from "@/lib/knowledge";
import { normalizeName } from "@/lib/parse";

describe("curated knowledge base", () => {
  it("has unique ingredient and source ids", () => {
    expect(new Set(ingredients.map((i) => i.id)).size).toBe(ingredients.length);
    expect(new Set(sources.map((s) => s.id)).size).toBe(sources.length);
  });

  it("cites at least one known source for every ingredient and rule", () => {
    for (const item of [...ingredients, ...rules]) {
      expect(item.sources.length, item.id).toBeGreaterThan(0);
      for (const id of item.sources) expect(sourceById.has(id), `${item.id} -> ${id}`).toBe(true);
    }
  });

  it("uses https URLs for every source", () => {
    for (const s of sources) expect(s.url, s.id).toMatch(/^https:\/\//);
  });

  it("never maps one name to two ingredients", () => {
    const owner = new Map<string, string>();
    for (const ing of ingredients) {
      for (const name of [ing.inci, ...ing.aliases].map(normalizeName)) {
        const prev = owner.get(name);
        expect(prev === undefined || prev === ing.id, `"${name}" is used by ${prev} and ${ing.id}`).toBe(true);
        owner.set(name, ing.id);
      }
    }
  });

  it("only uses tags in rules that some ingredient has", () => {
    const tags = new Set(ingredients.flatMap((i) => i.tags));
    for (const rule of rules) {
      const used = rule.kind === "combination" ? rule.groups.flat() : rule.tags;
      for (const t of used) expect(tags.has(t), `${rule.id} uses unknown tag ${t}`).toBe(true);
    }
  });

  it("avoids absolute safety language in user-facing text", () => {
    const banned = /\b(safe|toxic|clean beauty|cures?|guaranteed|non-toxic)\b/i;
    for (const text of [...ingredients.map((i) => i.description), ...rules.flatMap((r) => [r.explanation, r.suggestion])]) {
      expect(text).not.toMatch(banned);
    }
  });
});
