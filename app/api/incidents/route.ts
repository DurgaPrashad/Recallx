import { NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureDbReady } from "@/db";
import { incidents, services, timelineEvents } from "@/db/schema";
import { listIncidentsWithMemoryMatch } from "@/lib/incidents";
import { id as genId, nowIso } from "@/lib/ids";
import { handleRouteError, parseJsonBody } from "@/lib/api-utils";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const payload = await listIncidentsWithMemoryMatch();
    return NextResponse.json({ incidents: payload });
  } catch (err) {
    return handleRouteError(err, "GET /api/incidents");
  }
}

const createIncidentSchema = z.object({
  title: z.string().min(3),
  serviceSlug: z.string().min(1),
  severity: z.enum(["sev1", "sev2", "sev3"]),
  summary: z.string().min(3),
  symptoms: z.string().min(3),
  alerts: z.string().min(1),
  deployContext: z.string().optional(),
  errorRateStart: z.number().min(0).max(100),
  errorRatePeak: z.number().min(0).max(100),
  errorRateCurrent: z.number().min(0).max(100),
  p95LatencyMs: z.number().min(0),
  dbConnectionsUsed: z.number().min(0).optional(),
  dbConnectionsLimit: z.number().min(0).optional(),
  assignedEngineerId: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, createIncidentSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    await ensureDbReady();
    const service = await db.query.services.findFirst({ where: eq(services.slug, body.serviceSlug) });
    if (!service) return handleRouteError(new Error(`Unknown service: ${body.serviceSlug}`), "POST /api/incidents");

    const key = `INC-${1200 + Math.floor(Math.random() * 8999)}`;
    const incidentId = genId("inc");
    const startedAt = nowIso();

    await db.insert(incidents)
      .values({
        id: incidentId,
        key,
        title: body.title,
        serviceId: service.id,
        severity: body.severity,
        status: "active",
        summary: body.summary,
        symptoms: body.symptoms,
        alerts: body.alerts,
        deployContext: body.deployContext ?? null,
        errorRateStart: body.errorRateStart,
        errorRatePeak: body.errorRatePeak,
        errorRateCurrent: body.errorRateCurrent,
        p95LatencyMs: body.p95LatencyMs,
        dbConnectionsUsed: body.dbConnectionsUsed ?? null,
        dbConnectionsLimit: body.dbConnectionsLimit ?? null,
        assignedEngineerId: body.assignedEngineerId ?? null,
        startedAt,
        resolvedAt: null,
        isHero: false,
        demoOrder: 9999,
        patternTag: null,
        createdAt: nowIso(),
      })
      .run();

    await db.insert(timelineEvents)
      .values({
        id: genId("tl"),
        incidentId,
        timestamp: startedAt,
        type: "alert",
        author: "PagerDuty",
        content: `Alert triggered: ${body.alerts}`,
        attemptId: null,
        createdAt: nowIso(),
      })
      .run();

    return NextResponse.json({ incidentId, key }, { status: 201 });
  } catch (err) {
    return handleRouteError(err, "POST /api/incidents");
  }
}
