import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import { getEnv } from "../lib/env";

const env = getEnv();
const resolvedPath = path.resolve(process.cwd(), env.DATABASE_PATH);
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const sqlite = new Database(resolvedPath);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: path.resolve(process.cwd(), "db/migrations") });

console.log(`[db] Migrated ${resolvedPath}`);
sqlite.close();
