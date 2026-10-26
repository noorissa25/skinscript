// Product lookup through Open Beauty Facts (https://world.openbeautyfacts.org),
// an open, community-maintained database (ODbL). Used instead of scraping
// retailer sites, whose terms don't allow automated collection.

export interface ProductHit {
  code: string;
  name: string;
  brand: string;
  image: string | null;
  ingredients: string;
  url: string;
}

interface ObfProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  lang?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  image_front_small_url?: string;
}

const OBF = "https://world.openbeautyfacts.org";
const FIELDS = "code,product_name,brands,lang,ingredients_text,ingredients_text_en,image_front_small_url";
// Open Beauty Facts asks API clients to identify themselves.
const USER_AGENT = "skinscript/0.1 (beauty ingredient checker; portfolio project)";
const MIN_INGREDIENTS_LENGTH = 25;

/**
 * Pick the most useful ingredient text. INCI names are international, so a
 * label typed in as INCI (contains "aqua"/"water") is used as-is; translated
 * lists ("eau, glycérine") fall back to the database's English version.
 * Line breaks inside names ("CETYL\nALCOHOL") come from how labels were typed
 * in, so they are joined back up; commas still separate ingredients.
 */
export function pickIngredients(p: ObfProduct): string {
  const raw = (p.ingredients_text ?? "").trim();
  const english = (p.ingredients_text_en ?? "").trim();
  const looksInci = /\b(aqua|water)\b/i.test(raw);
  const chosen = raw && (p.lang === "en" || looksInci) ? raw : english || raw;
  return chosen.replace(/\s*\r?\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}

export function toHit(p: ObfProduct): ProductHit | null {
  const ingredients = pickIngredients(p);
  if (!p.code || ingredients.length < MIN_INGREDIENTS_LENGTH) return null;
  const name = (p.product_name ?? "").trim() || p.code;
  const brand = (p.brands ?? "").split(",")[0].trim();
  // Community data includes placeholder entries such as brand "Test".
  if (/^test$/i.test(brand) || /^test$/i.test(name)) return null;
  return {
    code: p.code,
    name,
    brand,
    image: p.image_front_small_url ?? null,
    ingredients,
    url: `${OBF}/product/${p.code}`,
  };
}

export function isBarcode(query: string) {
  return /^\d{8,14}$/.test(query.replace(/\s/g, ""));
}

async function obfFetch(path: string, retries = 1): Promise<unknown> {
  try {
    return await obfFetchOnce(path);
  } catch (err) {
    // The public API occasionally returns a one-off error page; try once more.
    if (retries <= 0) throw err;
    await new Promise((r) => setTimeout(r, 800));
    return obfFetch(path, retries - 1);
  }
}

async function obfFetchOnce(path: string) {
  const res = await fetch(`${OBF}${path}`, {
    // Browsers manage User-Agent themselves; the server identifies the app as OBF asks.
    headers: typeof window === "undefined" ? { "User-Agent": USER_AGENT, Accept: "application/json" } : { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Open Beauty Facts responded ${res.status}`);
  return res.json();
}

/** Search by product name/brand, or look up an exact barcode. Only products with an ingredient list are returned. */
export async function searchProducts(query: string, limit = 8): Promise<ProductHit[]> {
  const q = query.trim();
  if (isBarcode(q)) {
    const data = (await obfFetch(`/api/v2/product/${encodeURIComponent(q.replace(/\s/g, ""))}.json?fields=${FIELDS}`)) as { product?: ObfProduct };
    const hit = data?.product ? toHit(data.product) : null;
    return hit ? [hit] : [];
  }
  const params = new URLSearchParams({
    search_terms: q,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "30",
    fields: FIELDS,
  });
  const data = (await obfFetch(`/cgi/search.pl?${params}`)) as { products?: ObfProduct[] };
  const hits: ProductHit[] = [];
  const seen = new Set<string>();
  for (const p of data?.products ?? []) {
    const hit = toHit(p);
    if (!hit) continue;
    // The database often has the same product under several barcodes.
    const key = `${hit.brand}|${hit.name}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push(hit);
    if (hits.length >= limit) break;
  }
  return hits;
}
