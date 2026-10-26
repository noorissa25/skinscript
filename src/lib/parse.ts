import type { ParsedIngredient } from "./types";

/**
 * Lowercase, unify punctuation and whitespace so that "Caprylic / Capric
 * Triglyceride", "caprylic/capric triglyceride" and OCR variants compare equal.
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[‐-―−]/g, "-")
    .replace(/[‘’`´]/g, "'")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*-\s*/g, "-")
    .replace(/[*†‡°®™]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s.,;:'"-]+|[\s.,;:'"-]+$/g, "")
    .trim();
}

// OCR often reads the "I" in INGREDIENTS as "l", "1" or "|".
const INGREDIENTS_WORD = "ingr[eé]d[il1|]ents?";
const HEADER = new RegExp(`^\\s*(?:full\\s+)?(?:${INGREDIENTS_WORD}|inci|contains|composition)\\s*[:：.-]?\\s*`, "i");
// "May contain (+/-):" introduces a colorant list in makeup; keep the colorants.
const MAY_CONTAIN = /\[?\(?\+\/-\)?\]?\s*|may contain\s*(?:\(\+\/-\))?\s*:?/gi;
// US drug-facts panels: "Active ingredients: ... Inactive ingredients: ...".
const ACTIVE_HEADER = new RegExp(`\\b(?:active|inactive|other)\\s+${INGREDIENTS_WORD}\\s*[:：]?\\s*`, "gi");
const MAX_WORDS = 6;
const PERCENT = /\s*\b\d+(?:[.,]\d+)?\s*%/g;

/**
 * Turn a pasted or OCR'd label into a list of ingredient entries.
 * Splits on commas, semicolons, bullets and line breaks, but keeps commas
 * inside parentheses ("Retinol (Vitamin A, 0.3%)") and slashes inside names
 * ("Caprylic/Capric Triglyceride").
 */
export function parseIngredientList(text: string): ParsedIngredient[] {
  let body = text
    .replace(/\r\n?/g, "\n")
    // Re-join words hyphenated across a line break by OCR: "Phenoxy-\nethanol".
    .replace(/([a-z])-\n\s*([a-z])/gi, "$1$2");

  const headerIndex = body.search(new RegExp(`\\b${INGREDIENTS_WORD}\\s*[:：]`, "i"));
  if (headerIndex > 0) body = body.slice(headerIndex);
  if (headerIndex >= 0) {
    // On a scanned label the list usually ends with a period and a blank line
    // before directions or warnings start.
    const end = body.search(/\.\s*\n\s*\n/);
    if (end > 0) body = body.slice(0, end);
  }
  body = body.replace(HEADER, "").replace(ACTIVE_HEADER, ", ").replace(MAY_CONTAIN, ", ");

  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of body) {
    if (ch === "(" || ch === "[") depth++;
    if ((ch === ")" || ch === "]") && depth > 0) depth--;
    const separator = ch === "," || ch === ";" || ch === "•" || ch === "·" || ch === "|" || ch === "\n";
    if (separator && depth === 0) {
      parts.push(current);
      current = "";
    } else if (ch === "\n") {
      current += " ";
    } else {
      current += ch;
    }
  }
  parts.push(current);

  const result: ParsedIngredient[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const raw = part
      .replace(PERCENT, "")
      // Tidy what is left after "(Vitamin A, 0.3%)" or "(5%)".
      .replace(/\s*,\s*([)\]])/g, "$1")
      .replace(/([([])\s*,\s*/g, "$1")
      .replace(/\(\s*\)|\[\s*\]/g, "")
      .replace(/\s+/g, " ").replace(/^[\s.]+|[\s.]+$/g, "").trim();
    if (!raw || raw.length < 2 || !/[a-z]/i.test(raw)) continue;
    // Footnotes such as "*Organic" or "**Certified organic ingredient".
    if (/^\*+\s*(certified\s+)?organic/i.test(part.trim())) continue;

    const alternates: string[] = [];
    const outer = raw.replace(/\(([^()]*)\)|\[([^[\]]*)\]/g, (_, a: string | undefined, b: string | undefined) => {
      const inner = (a ?? b ?? "").trim();
      if (inner) alternates.push(...inner.split(/\s*[,/]\s*/).map(normalizeName).filter(Boolean));
      return " ";
    });
    // Sentences ("Sample label for testing OCR") are not ingredient names.
    if (normalizeName(outer).split(" ").length > MAX_WORDS) continue;
    const normalized = normalizeName(raw);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    const outerName = normalizeName(outer);
    if (outerName && outerName !== normalized) alternates.unshift(outerName);
    // Multilingual labels join synonyms with slashes ("Aqua/Water/Eau", "Butyrospermum
    // Parkii Butter/Shea Butter"). Each part is a fallback; the full name is tried first,
    // so real slash names like "Caprylic/Capric Triglyceride" still match as a whole.
    for (const name of [normalized, outerName]) {
      if (name.includes("/")) alternates.push(...name.split("/").map((part) => part.trim()).filter((part) => part.length > 2));
    }

    result.push({ raw, normalized, alternates, position: result.length + 1 });
  }
  return result;
}
