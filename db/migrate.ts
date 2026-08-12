import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import fs from "node:fs";
import path from "node:path";
import { getEnv } from "../lib/env";

const env = getEnv();

if (env.DATABASE_URL.startsWith("file:")) {
  const filePath = env.DATABASE_URL.slice("file:".length);
  const resolvedPath = path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
}

const client = createClient({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN });
const db = drizzle(client);

async function main() {
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "db/migrations") });
  console.log(`[db] Migrated ${env.DATABASE_URL}`);
  client.close();
}

main().catch((err) => {
  console.error("[db] Migration failed:", err);
  process.exit(1);
});
