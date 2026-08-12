import { z } from "zod";

const envSchema = z.object({
  HINDSIGHT_API_URL: z.string().default("http://localhost:8888"),
  HINDSIGHT_API_KEY: z.string().optional(),
  HINDSIGHT_BANK_ID: z.string().default("recallx"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),
  // libSQL connection URL. Left unset, Recall-X falls back to a zero-config
  // database automatically (see db/index.ts): a local embedded SQLite file
  // during normal local development, or an in-memory database that
  // auto-seeds itself with demo data when no persistent filesystem is
  // available (e.g. serverless platforms like Vercel). Point this at a
  // hosted libSQL database (e.g. libsql://your-db.turso.io) for a real
  // persistent deployment.
  DATABASE_URL: z.string().optional(),
  // Required when DATABASE_URL points at a remote libSQL/Turso database.
  DATABASE_AUTH_TOKEN: z.string().optional(),
  SKIP_HINDSIGHT: z
    .string()
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  // Some hosts (e.g. Vercel, when a variable is "detected" from .env.example
  // but left blank in the dashboard) inject empty-string env vars rather than
  // omitting them, which would defeat zod's `.default()`/`.optional()`
  // handling. Treat blank strings the same as unset everywhere.
  const cleaned = Object.fromEntries(Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v]));
  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    console.error("[env] Invalid environment configuration", parsed.error.flatten());
    throw new Error("Invalid environment configuration. Check .env against .env.example.");
  }
  cached = parsed.data;
  return cached;
}
