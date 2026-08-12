import "dotenv/config";
import { client, db } from "@/db";
import { getEnv } from "@/lib/env";
import { runSeed } from "@/lib/seed/run-seed";

const env = getEnv();

async function main() {
  console.log(`[seed] Using database at ${env.DATABASE_URL ?? "file:./data/recallx.db (default)"}`);
  console.log("[seed] Clearing existing data...");

  const summary = await runSeed(db, {
    withHindsight: !env.SKIP_HINDSIGHT,
    log: (msg) => console.log(`[seed] ${msg}`),
  });

  console.log("\n[seed] Summary:");
  console.log(`  Incidents seeded:      ${summary.incidentCount} (1 unresolved hero incident: ${summary.heroKey})`);
  console.log(`  Troubleshooting steps: ${summary.totalAttempts}`);
  console.log(`  Dead ends (failed/partial): ${summary.totalDeadEnds}`);
  console.log(`  Verified fixes:        ${summary.totalFixes}`);
  console.log(`  Recurring patterns:    ${summary.patterns.length} (${summary.patterns.join(", ")})`);
  if (!env.SKIP_HINDSIGHT && summary.retainFailures > 0) {
    console.log(`  ⚠ ${summary.retainFailures} incident(s) failed to retain into Hindsight — check Hindsight is running.`);
  }
  console.log("\n[seed] Done.");
  client.close();
}

main().catch((err) => {
  console.error("[seed] Fatal error:", err);
  process.exit(1);
});
