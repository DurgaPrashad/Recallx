import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import { CREATE_TABLES_SQL } from "./schema-ddl";
import { getEnv } from "@/lib/env";

const env = getEnv();

// No DATABASE_URL configured -> fall back to a zero-config in-memory
// database that auto-creates its schema and seeds itself with demo data on
// first use (see ensureDbReady below). This is what makes the app "just
// work" on a fresh deploy (e.g. Vercel) with no database provisioned yet —
// the local filesystem there is ephemeral/read-only anyway, so a persistent
// file isn't an option. Configure a real DATABASE_URL (a local file for
// dev, or a hosted libSQL/Turso database for production) for data that
// actually persists across requests and deploys.
const isEphemeral = !env.DATABASE_URL;
const effectiveUrl = env.DATABASE_URL ?? ":memory:";

if (effectiveUrl.startsWith("file:")) {
  const filePath = effectiveUrl.slice("file:".length);
  const resolvedPath = path.resolve(/* turbopackIgnore: true */ process.cwd(), filePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
}

const client = createClient({
  url: effectiveUrl,
  authToken: env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export { client, isEphemeral };

let readyPromise: Promise<void> | null = null;

/**
 * Ensures the database has a schema and data before it's queried. A no-op
 * for a real configured DATABASE_URL (that's expected to already be
 * migrated/seeded via `npm run db:migrate` / `npm run seed`). For the
 * zero-config in-memory fallback, creates the schema and seeds it with the
 * demo dataset exactly once per warm instance. Call this at the top of any
 * code path that touches the database before assuming data exists.
 */
export function ensureDbReady(): Promise<void> {
  if (!isEphemeral) return Promise.resolve();
  if (!readyPromise) {
    readyPromise = (async () => {
      for (const statement of CREATE_TABLES_SQL) {
        await client.execute(statement);
      }
      const { runSeed } = await import("@/lib/seed/run-seed");
      const summary = await runSeed(db, { withHindsight: false });
      console.log(
        `[db] No DATABASE_URL configured — seeded an in-memory demo database ` +
          `(${summary.incidentCount} incidents, hero: ${summary.heroKey}). ` +
          `Set DATABASE_URL to a real libSQL database for data that persists across requests.`
      );
    })().catch((err) => {
      readyPromise = null; // allow retry on next call instead of caching a permanent failure
      throw err;
    });
  }
  return readyPromise;
}
