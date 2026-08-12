import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";

export class LlmUnavailableError extends Error {
  constructor(cause: unknown) {
    super(`LLM unavailable: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "LlmUnavailableError";
  }
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const env = getEnv();
  if (!env.ANTHROPIC_API_KEY) throw new LlmUnavailableError("ANTHROPIC_API_KEY is not set");
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

/**
 * Calls Claude with a system prompt + user prompt and parses a single JSON
 * object out of the response. Throws LlmUnavailableError on any failure so
 * callers can fall back to deterministic synthesis.
 */
export async function completeJson<T>(params: { system: string; prompt: string; maxTokens?: number }): Promise<T> {
  const env = getEnv();
  const anthropic = getClient();
  try {
    const response = await anthropic.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: params.maxTokens ?? 2048,
      system: params.system,
      messages: [{ role: "user", content: params.prompt }],
    });
    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") throw new Error("No text content in LLM response");
    const jsonMatch = block.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in LLM response");
    return JSON.parse(jsonMatch[0]) as T;
  } catch (err) {
    throw new LlmUnavailableError(err);
  }
}
