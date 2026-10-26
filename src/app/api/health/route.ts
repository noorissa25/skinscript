import { connection } from "next/server";
import { llmEnabled } from "@/lib/llm";

export async function GET() {
  // Read the env at request time, not at build time.
  await connection();
  return Response.json({ ok: true, llm: llmEnabled() });
}
