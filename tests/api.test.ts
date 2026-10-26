import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as analyze } from "@/app/api/analyze/route";
import { POST as summary } from "@/app/api/summary/route";
import { groundingPayload } from "@/lib/llm";
import { analyzeProducts } from "@/lib/analyze";

const post = (body: unknown) =>
  new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/analyze", () => {
  it("returns an analysis", async () => {
    const res = await analyze(post({ products: [{ name: "Serum", text: "Water, Retinol, Glycolic Acid" }] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.stats).toEqual({ total: 3, recognized: 3, fuzzy: 0 });
    expect(data.disclaimer).toMatch(/not medical advice/);
  });

  it("rejects malformed bodies", async () => {
    expect((await analyze(post("not json"))).status).toBe(400);
    expect((await analyze(post({ products: [] }))).status).toBe(400);
    expect((await analyze(post({ products: [{ name: "x" }] }))).status).toBe(400);
    expect((await analyze(post({ products: [{ text: "a".repeat(10_001) }] }))).status).toBe(400);
    expect((await analyze(post({ products: Array(5).fill({ text: "Water" }) }))).status).toBe(400);
  });
});

describe("POST /api/summary", () => {
  it("is disabled without an API key, so the app works fully without one", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await summary(post({ products: [{ text: "Water" }] }));
    expect(res.status).toBe(501);
  });
});

describe("groundingPayload", () => {
  it("only passes curated descriptions and marks unknown ingredients", () => {
    const payload = groundingPayload(analyzeProducts([{ name: "P", text: "Glycerin, Ethoxydiglycol" }]));
    expect(payload.products[0].ingredients).toEqual([
      expect.objectContaining({ name: "Glycerin", functions: ["humectant"] }),
      { name: "Ethoxydiglycol", unrecognized: true },
    ]);
  });
});
