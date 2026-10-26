import Anthropic from "@anthropic-ai/sdk";
import type { Analysis } from "./types";

export const DEFAULT_MODEL = "claude-opus-5-5";

export function llmEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM_PROMPT = `You write short, friendly summaries of a skincare ingredient check.

Rules:
- Use ONLY the facts in the JSON you are given. Do not add ingredient claims, benefits, percentages or studies that are not in it.
- Ingredients marked "unrecognized" have no data: say they were not checked rather than guessing what they do.
- Keep the cautious wording of the findings ("may", "can"). Never say a product is safe, unsafe, clean, toxic or right for someone's skin.
- Do not diagnose or give medical advice. If findings mention pregnancy, allergies or prescription products, suggest asking a dermatologist or pharmacist.
- Plain language, second person, under 160 words. Start with what the product(s) mainly contain, then the flags in order of the list, then one sentence reminding the reader this is not medical advice.`;

/** Strip the analysis down to the curated facts the model is allowed to use. */
export function groundingPayload(analysis: Analysis) {
  return {
    products: analysis.products.map((p) => ({
      name: p.name,
      ingredients: p.ingredients.map((m) =>
        m.match
          ? { name: m.raw, functions: m.match.ingredient.functions, description: m.match.ingredient.description }
          : { name: m.raw, unrecognized: true },
      ),
    })),
    findings: analysis.findings.map((f) => ({
      severity: f.severity,
      title: f.title,
      explanation: f.explanation,
      suggestion: f.suggestion,
      ingredients: f.evidence.flat().map((h) => `${h.name} (${h.product})`),
      notes: f.notes,
    })),
  };
}

export async function summarize(analysis: Analysis): Promise<string> {
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 2000,
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Summarize this ingredient check:\n\n${JSON.stringify(groundingPayload(analysis), null, 2)}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to summarize this input.");
  }
  const text = response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("\n")
    .trim();
  if (!text) throw new Error("The model returned an empty summary.");
  return text;
}
