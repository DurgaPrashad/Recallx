import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, sqlite } from "@/db";
import { attempts, engineers, incidents, metricSnapshots, resolutions, services, timelineEvents } from "@/db/schema";
import { ENGINEERS, SERVICES } from "./data/services";
import { INCIDENTS } from "./data/incidents";
import type { SeedIncident } from "./data/types";
import { id as genId, nowIso } from "@/lib/ids";
import { getEnv } from "@/lib/env";
import * as hindsight from "@/lib/hindsight/client";
import { retainAttempt, retainIncidentContext, retainResolution } from "@/lib/memory/retain";
import type { Incident, Service } from "@/lib/types";

const env = getEnv();

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60_000);
}

/** Deterministic small minute jitter per incident key, purely for timestamp variety. */
function jitterMinutes(key: string): number {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) % 47;
  return h;
}

function computeStartedAt(seed: SeedIncident, now: Date): string {
  if (seed.isHero) {
    return new Date(now.getTime() - 40 * 60_000).toISOString();
  }
  const day = addDays(now, seed.daysAgo);
  day.setUTCHours(seed.hour, jitterMinutes(seed.key) % 60, 0, 0);
  return day.toISOString();
}

/** Builds a small triangular-ish ramp of metric points from start -> peak -> current. */
function buildMetricPoints(
  startedAt: string,
  durationMin: number,
  errorRateStart: number,
  errorRatePeak: number,
  errorRateCurrent: number,
  p95LatencyMs: number,
  dbConnectionsUsed: number | null,
  dbConnectionsLimit: number | null
) {
  const pointCount = 7;
  const peakFrac = 0.35;
  const points: { minute: number; errorRate: number; p95: number; dbConn: number | null; cpu: number }[] = [];
  for (let i = 0; i < pointCount; i++) {
    const frac = i / (pointCount - 1);
    const minute = Math.round(frac * durationMin);
    let errorRate: number;
    let p95: number;
    if (frac <= peakFrac) {
      const t = frac / peakFrac;
      errorRate = errorRateStart + (errorRatePeak - errorRateStart) * t;
      p95 = 200 + (p95LatencyMs - 200) * t;
    } else {
      const t = (frac - peakFrac) / (1 - peakFrac);
      errorRate = errorRatePeak + (errorRateCurrent - errorRatePeak) * t;
      p95 = p95LatencyMs - (p95LatencyMs - Math.max(200, errorRateCurrent > errorRateStart + 1 ? p95LatencyMs * 0.6 : 220)) * t;
    }
    const dbConn =
      dbConnectionsUsed != null && dbConnectionsLimit != null
        ? Math.round(Math.min(dbConnectionsLimit, Math.max(0, dbConnectionsUsed * (0.3 + 0.7 * Math.min(1, errorRate / Math.max(errorRatePeak, 0.1))))))
        : null;
    const cpu = Math.min(98, 30 + errorRate * 3.2);
    points.push({ minute, errorRate: Math.round(errorRate * 10) / 10, p95: Math.round(p95), dbConn, cpu: Math.round(cpu * 10) / 10 });
  }
  return points.map((p) => ({ timestamp: addMinutes(startedAt, p.minute), errorRate: p.errorRate, p95LatencyMs: p.p95, dbConnections: p.dbConn, cpuPercent: p.cpu }));
}

async function main() {
  console.log(`[seed] Using database at ${env.DATABASE_PATH}`);
  console.log("[seed] Clearing existing data...");
  db.delete(metricSnapshots).run();
  db.delete(timelineEvents).run();
  db.delete(attempts).run();
  db.delete(resolutions).run();
  db.delete(incidents).run();
  db.delete(engineers).run();
  db.delete(services).run();

  const serviceIdBySlug = new Map<string, string>();
  for (const s of SERVICES) {
    const id = genId("svc");
    serviceIdBySlug.set(s.slug, id);
    db.insert(services).values({ id, name: s.name, slug: s.slug, tier: s.tier, description: s.description }).run();
  }

  const engineerIdByHandle = new Map<string, string>();
  for (const e of ENGINEERS) {
    const id = genId("eng");
    engineerIdByHandle.set(e.handle, id);
    db.insert(engineers).values({ id, name: e.name, handle: e.handle, role: e.role }).run();
  }

  console.log(`[seed] Inserted ${SERVICES.length} services, ${ENGINEERS.length} engineers`);

  const now = new Date();
  const skipHindsight = env.SKIP_HINDSIGHT;

  if (!skipHindsight) {
    console.log("[seed] Resetting Hindsight bank for a clean reseed...");
    try {
      await hindsight.resetBank();
      console.log("[seed] Hindsight bank ready.");
    } catch (err) {
      console.warn(`[seed] Could not reach Hindsight (${(err as Error).message}). Continuing with SQLite-only seed.`);
    }
  } else {
    console.log("[seed] SKIP_HINDSIGHT=true — seeding SQLite only.");
  }

  let totalAttempts = 0;
  let totalDeadEnds = 0;
  let totalFixes = 0;
  const patternSet = new Set<string>();
  let retainFailures = 0;

  for (let i = 0; i < INCIDENTS.length; i++) {
    const seed = INCIDENTS[i]!;
    const serviceId = serviceIdBySlug.get(seed.service);
    if (!serviceId) throw new Error(`Unknown service slug in seed data: ${seed.service}`);
    const engineerId = engineerIdByHandle.get(seed.assignedEngineer);
    const incidentId = genId("inc");
    const startedAt = computeStartedAt(seed, now);
    const lastAttemptEnd = seed.attempts.length ? Math.max(...seed.attempts.map((a) => a.endMinute)) : 0;
    const resolvedMinute = seed.resolution?.resolvedMinute ?? (seed.resolution ? lastAttemptEnd + 12 : undefined);
    const resolvedAt = resolvedMinute != null ? addMinutes(startedAt, resolvedMinute) : null;
    const demoOrder = i + 1;

    if (seed.patternTag) patternSet.add(seed.patternTag);

    db.insert(incidents)
      .values({
        id: incidentId,
        key: seed.key,
        title: seed.title,
        serviceId,
        severity: seed.severity,
        status: seed.status,
        summary: seed.summary,
        symptoms: seed.symptoms,
        alerts: seed.alerts,
        deployContext: seed.deployContext ?? null,
        errorRateStart: seed.errorRateStart,
        errorRatePeak: seed.errorRatePeak,
        errorRateCurrent: seed.errorRateCurrent,
        p95LatencyMs: seed.p95LatencyMs,
        dbConnectionsUsed: seed.dbConnectionsUsed ?? null,
        dbConnectionsLimit: seed.dbConnectionsLimit ?? null,
        assignedEngineerId: engineerId ?? null,
        startedAt,
        resolvedAt,
        isHero: Boolean(seed.isHero),
        demoOrder,
        patternTag: seed.patternTag ?? null,
        createdAt: nowIso(),
      })
      .run();

    // Timeline: alert first.
    db.insert(timelineEvents)
      .values({
        id: genId("tl"),
        incidentId,
        timestamp: startedAt,
        type: "alert",
        author: "PagerDuty",
        content: `Alert triggered: ${seed.alerts}`,
        attemptId: null,
        createdAt: nowIso(),
      })
      .run();

    const engineerName = ENGINEERS.find((e) => e.handle === seed.assignedEngineer)?.name ?? seed.assignedEngineer;

    const insertedAttempts: { id: string; startedAtIso: string; endedAtIso: string }[] = [];
    seed.attempts.forEach((a, idx) => {
      const attemptId = genId("att");
      const attStart = addMinutes(startedAt, a.startMinute);
      const attEnd = addMinutes(startedAt, a.endMinute);
      db.insert(attempts)
        .values({
          id: attemptId,
          incidentId,
          action: a.action,
          hypothesis: a.hypothesis ?? null,
          startedAt: attStart,
          endedAt: attEnd,
          outcome: a.outcome,
          outcomeNotes: a.outcomeNotes,
          orderIndex: idx,
          memorySynced: false,
          createdAt: nowIso(),
        })
        .run();
      insertedAttempts.push({ id: attemptId, startedAtIso: attStart, endedAtIso: attEnd });
      totalAttempts += 1;
      if (a.outcome === "failed" || a.outcome === "partial") totalDeadEnds += 1;

      db.insert(timelineEvents)
        .values({
          id: genId("tl"),
          incidentId,
          timestamp: attStart,
          type: "action",
          author: engineerName,
          content: `Attempted: ${a.action}${a.hypothesis ? ` — hypothesis: ${a.hypothesis}` : ""}`,
          attemptId,
          createdAt: nowIso(),
        })
        .run();
      db.insert(timelineEvents)
        .values({
          id: genId("tl"),
          incidentId,
          timestamp: attEnd,
          type: "observation",
          author: engineerName,
          content: a.outcomeNotes,
          attemptId,
          createdAt: nowIso(),
        })
        .run();
    });

    let resolutionId: string | null = null;
    if (seed.resolution && resolvedAt) {
      resolutionId = genId("res");
      db.insert(resolutions)
        .values({
          id: resolutionId,
          incidentId,
          rootCause: seed.resolution.rootCause,
          fixSummary: seed.resolution.fixSummary,
          lessonsLearned: seed.resolution.lessonsLearned,
          timeToResolutionMin: resolvedMinute ?? null,
          memorySynced: false,
          createdAt: resolvedAt,
        })
        .run();
      totalFixes += 1;
      db.insert(timelineEvents)
        .values({
          id: genId("tl"),
          incidentId,
          timestamp: resolvedAt,
          type: "resolution",
          author: engineerName,
          content: `Resolved: ${seed.resolution.fixSummary}`,
          attemptId: null,
          createdAt: nowIso(),
        })
        .run();
    }

    const durationMin = resolvedMinute ?? (seed.isHero ? 40 : Math.max(60, lastAttemptEnd + 30));
    const metricPoints = buildMetricPoints(
      startedAt,
      durationMin,
      seed.errorRateStart,
      seed.errorRatePeak,
      seed.errorRateCurrent,
      seed.p95LatencyMs,
      seed.dbConnectionsUsed ?? null,
      seed.dbConnectionsLimit ?? null
    );
    for (const p of metricPoints) {
      db.insert(metricSnapshots)
        .values({
          id: genId("met"),
          incidentId,
          timestamp: p.timestamp,
          errorRate: p.errorRate,
          p95LatencyMs: p.p95LatencyMs,
          dbConnections: p.dbConnections,
          cpuPercent: p.cpuPercent,
        })
        .run();
    }

    // Retain into Hindsight: context + each non-pending attempt + resolution.
    if (!skipHindsight) {
      const incidentRow: Incident = {
        id: incidentId,
        key: seed.key,
        title: seed.title,
        serviceId,
        severity: seed.severity,
        status: seed.status,
        summary: seed.summary,
        symptoms: seed.symptoms,
        alerts: seed.alerts,
        deployContext: seed.deployContext ?? null,
        errorRateStart: seed.errorRateStart,
        errorRatePeak: seed.errorRatePeak,
        errorRateCurrent: seed.errorRateCurrent,
        p95LatencyMs: seed.p95LatencyMs,
        dbConnectionsUsed: seed.dbConnectionsUsed ?? null,
        dbConnectionsLimit: seed.dbConnectionsLimit ?? null,
        assignedEngineerId: engineerId ?? null,
        startedAt,
        resolvedAt,
        isHero: Boolean(seed.isHero),
        demoOrder,
        patternTag: seed.patternTag ?? null,
        createdAt: nowIso(),
      };
      const serviceRow: Service = { id: serviceId, name: seed.service, slug: seed.service, tier: "tier-1", description: "" };

      try {
        if (seed.attempts.length > 0 || seed.resolution) {
          await retainIncidentContext(incidentRow, serviceRow, startedAt);
        }
        for (let idx = 0; idx < seed.attempts.length; idx++) {
          const a = seed.attempts[idx]!;
          const inserted = insertedAttempts[idx]!;
          await retainAttempt(
            incidentRow,
            serviceRow,
            {
              id: inserted.id,
              incidentId,
              action: a.action,
              hypothesis: a.hypothesis ?? null,
              startedAt: inserted.startedAtIso,
              endedAt: inserted.endedAtIso,
              outcome: a.outcome,
              outcomeNotes: a.outcomeNotes,
              orderIndex: idx,
              memorySynced: false,
              createdAt: nowIso(),
            },
            inserted.endedAtIso
          );
          db.update(attempts).set({ memorySynced: true }).where(eq(attempts.id, inserted.id)).run();
        }
        if (seed.resolution && resolutionId && resolvedAt) {
          await retainResolution(
            incidentRow,
            serviceRow,
            {
              id: resolutionId,
              incidentId,
              rootCause: seed.resolution.rootCause,
              fixSummary: seed.resolution.fixSummary,
              lessonsLearned: seed.resolution.lessonsLearned,
              timeToResolutionMin: resolvedMinute ?? null,
              memorySynced: false,
              createdAt: resolvedAt,
            },
            resolvedAt
          );
          db.update(resolutions).set({ memorySynced: true }).where(eq(resolutions.id, resolutionId)).run();
        }
        process.stdout.write(`\r[seed] Retained into Hindsight: ${i + 1}/${INCIDENTS.length} (${seed.key})     `);
      } catch (err) {
        retainFailures += 1;
        console.warn(`\n[seed] Failed to retain ${seed.key} into Hindsight: ${(err as Error).message}`);
      }
    }
  }

  if (!skipHindsight) console.log("\n[seed] Hindsight retain pass complete.");

  console.log("\n[seed] Summary:");
  console.log(`  Incidents seeded:      ${INCIDENTS.length} (1 unresolved hero incident: ${INCIDENTS.find((i) => i.isHero)?.key})`);
  console.log(`  Troubleshooting steps: ${totalAttempts}`);
  console.log(`  Dead ends (failed/partial): ${totalDeadEnds}`);
  console.log(`  Verified fixes:        ${totalFixes}`);
  console.log(`  Recurring patterns:    ${patternSet.size} (${[...patternSet].join(", ")})`);
  if (!skipHindsight && retainFailures > 0) {
    console.log(`  ⚠ ${retainFailures} incident(s) failed to retain into Hindsight — check Hindsight is running.`);
  }
  console.log("\n[seed] Done.");
  sqlite.close();
}

main().catch((err) => {
  console.error("[seed] Fatal error:", err);
  process.exit(1);
});
