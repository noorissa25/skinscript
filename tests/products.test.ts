import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/products/route";
import { isBarcode, pickIngredients, searchProducts, toHit } from "@/lib/products";

afterEach(() => vi.unstubAllGlobals());

const mockFetch = (body: unknown, ok = true) =>
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok, status: ok ? 200 : 503, json: async () => body })));

describe("pickIngredients", () => {
  it("keeps an INCI list typed as-is and joins names split across lines", () => {
    expect(pickIngredients({ lang: "en", ingredients_text: "AQUA/WATER,\r\nGLYCERIN, CETYL\r\nALCOHOL" })).toBe(
      "AQUA/WATER, GLYCERIN, CETYL ALCOHOL",
    );
  });

  it("uses the English version for a translated list", () => {
    expect(pickIngredients({ lang: "fr", ingredients_text: "Eau, glycérine", ingredients_text_en: "water, glycerin" })).toBe(
      "water, glycerin",
    );
  });
});

describe("toHit", () => {
  it("drops products without a usable ingredient list", () => {
    expect(toHit({ code: "1", product_name: "x", ingredients_text: "" })).toBeNull();
  });

  it("drops placeholder test entries", () => {
    expect(toHit({ code: "9", product_name: "CeraVe", brands: "Test", lang: "en", ingredients_text: "Aqua, Glycerin, Cetearyl Alcohol, Ceramide NP" })).toBeNull();
  });

  it("builds a cited hit", () => {
    const hit = toHit({ code: "3606000537439", product_name: "Moisturizing Cream", brands: "CeraVe, L'Oréal", lang: "en", ingredients_text: "Aqua/Water/Eau, Glycerin, Cetearyl Alcohol" });
    expect(hit).toMatchObject({ brand: "CeraVe", url: "https://world.openbeautyfacts.org/product/3606000537439" });
  });
});

describe("searchProducts", () => {
  it("recognizes barcodes", () => {
    expect(isBarcode("3606000537439")).toBe(true);
    expect(isBarcode("cerave")).toBe(false);
  });

  it("dedupes the same product listed under several barcodes", async () => {
    const p = { product_name: "Moisturizing Cream", brands: "CeraVe", lang: "en", ingredients_text: "Aqua, Glycerin, Cetearyl Alcohol, Ceramide NP" };
    mockFetch({ products: [{ ...p, code: "1" }, { ...p, code: "2" }, { code: "3", product_name: "No list" }] });
    const hits = await searchProducts("cerave cream");
    expect(hits.map((h) => h.code)).toEqual(["1"]);
  });
});

describe("GET /api/products", () => {
  const req = (q: string) => new Request(`http://localhost/api/products?q=${encodeURIComponent(q)}`);

  it("rejects too-short queries", async () => {
    expect((await GET(req("a"))).status).toBe(400);
  });

  it("retries a one-off upstream failure once", async () => {
    const ok = { products: [{ code: "1", product_name: "Cream", brands: "B", lang: "en", ingredients_text: "Aqua, Glycerin, Cetearyl Alcohol, Ceramide NP" }] };
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("blip")).mockResolvedValue({ ok: true, status: 200, json: async () => ok });
    vi.stubGlobal("fetch", fetchMock);
    expect((await searchProducts("cream")).map((h) => h.code)).toEqual(["1"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports an upstream failure as 502", async () => {
    mockFetch({}, false);
    expect((await GET(req("cerave"))).status).toBe(502);
  });
});
