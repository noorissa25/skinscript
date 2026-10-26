import { analyzeProducts } from "@/lib/analyze";
import { llmEnabled, summarize } from "@/lib/llm";
import { validateProducts } from "@/lib/validate";

// The summary is rebuilt from the same curated analysis on the server, so the
// model only ever sees facts from data/*.json, never client-supplied claims.
export async function POST(request: Request) {
  if (!llmEnabled()) {
    return Response.json({ error: "AI summaries are off. Set ANTHROPIC_API_KEY to enable them." }, { status: 501 });
  }
  const body = await request.json().catch(() => null);
  const result = validateProducts(body);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  try {
    const summary = await summarize(analyzeProducts(result.products));
    return Response.json({ summary });
  } catch (err) {
    console.error("summary failed", err);
    return Response.json({ error: "Could not generate a summary right now." }, { status: 502 });
  }
}
