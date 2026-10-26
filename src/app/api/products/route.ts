import { searchProducts } from "@/lib/products";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 100) {
    return Response.json({ error: "Search with 2 to 100 characters." }, { status: 400 });
  }
  try {
    const products = await searchProducts(q);
    return Response.json({ products, source: "Open Beauty Facts (ODbL)" });
  } catch (err) {
    console.error("product search failed", err);
    return Response.json({ error: "Product search is unavailable right now." }, { status: 502 });
  }
}
