import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import { getEnv } from "@/lib/env";

const env = getEnv();

// For a local embedded file ("file:./data/recallx.db"), make sure the parent
// directory exists. Remote libSQL/Turso URLs (libsql://, https://) need no such
// setup — that's the path used in serverless deployments (e.g. Vercel), where
// the local filesystem is ephemeral and can't be relied on as a database.
if (env.DATABASE_URL.startsWith("file:")) {
  const filePath = env.DATABASE_URL.slice("file:".length);
  const resolvedPath = path.resolve(/* turbopackIgnore: true */ process.cwd(), filePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
}

const client = createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export { client };
