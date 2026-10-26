import { MAX_PRODUCTS, MAX_TEXT_LENGTH } from "./analyze";
import type { ProductInput } from "./types";

export type ValidationResult = { ok: true; products: ProductInput[] } | { ok: false; error: string };

/** Validate the JSON body of POST /api/analyze and /api/summary. */
export function validateProducts(body: unknown): ValidationResult {
  if (!body || typeof body !== "object" || !Array.isArray((body as { products?: unknown }).products)) {
    return { ok: false, error: 'Expected a JSON body like {"products": [{"name": "...", "text": "..."}]}.' };
  }
  const raw = (body as { products: unknown[] }).products;
  if (raw.length === 0) return { ok: false, error: "Add at least one product." };
  if (raw.length > MAX_PRODUCTS) return { ok: false, error: `At most ${MAX_PRODUCTS} products at a time.` };

  const products: ProductInput[] = [];
  for (const [i, item] of raw.entries()) {
    const p = item as { name?: unknown; text?: unknown };
    if (!p || typeof p.text !== "string") return { ok: false, error: `Product ${i + 1} is missing "text".` };
    if (p.text.length > MAX_TEXT_LENGTH) {
      return { ok: false, error: `Product ${i + 1} is longer than ${MAX_TEXT_LENGTH} characters.` };
    }
    products.push({ name: typeof p.name === "string" ? p.name.slice(0, 80) : "", text: p.text });
  }
  if (products.every((p) => !p.text.trim())) return { ok: false, error: "Paste an ingredient list first." };
  return { ok: true, products };
}
