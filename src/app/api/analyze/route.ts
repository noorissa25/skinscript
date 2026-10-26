import { analyzeProducts } from "@/lib/analyze";
import { validateProducts } from "@/lib/validate";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = validateProducts(body);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json(analyzeProducts(result.products));
}
