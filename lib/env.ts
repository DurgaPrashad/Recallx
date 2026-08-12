import { z } from "zod";

const envSchema = z.object({
  HINDSIGHT_API_URL: z.string().default("http://localhost:8888"),
  HINDSIGHT_API_KEY: z.string().optional(),
  HINDSIGHT_BANK_ID: z.string().default("recallx"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),
  DATABASE_PATH: z.string().default("./data/recallx.db"),
  SKIP_HINDSIGHT: z
    .string()
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("[env] Invalid environment configuration", parsed.error.flatten());
    throw new Error("Invalid environment configuration. Check .env against .env.example.");
  }
  cached = parsed.data;
  return cached;
}
