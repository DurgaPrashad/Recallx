import { db } from "@/db";
import { attempts, briefCache, engineers, incidents, metricSnapshots, resolutions, services, timelineEvents } from "@/db/schema";
import { and, desc, eq, ne } from "drizzle-orm";
import type { IncidentFull } from "@/lib/types";

export interface IncidentListItem {
  incident: typeof incidents.$inferSelect;
  service: typeof services.$inferSelect;
  engineer: (typeof engineers.$inferSelect) | null;
  memoryMatch: number | null;
}

export async function listIncidentsWithMemoryMatch(): Promise<IncidentListItem[]> {
  const rows = await listIncidents();
  const briefs = await db.select({ incidentId: briefCache.incidentId, json: briefCache.json }).from(briefCache);
  const briefByIncidentId = new Map(briefs.map((b) => [b.incidentId, b.json]));

  return rows.map(({ incident, service, engineer }) => {
    let memoryMatch: number | null = null;
    const cached = briefByIncidentId.get(incident.id);
    if (cached) {
      try {
        memoryMatch = JSON.parse(cached).overallConfidence ?? null;
      } catch {
        memoryMatch = null;
      }
    }
    return { incident, service, engineer, memoryMatch };
  });
}

export async function listIncidents() {
  const rows = await db
    .select({ incident: incidents, service: services, engineer: engineers })
    .from(incidents)
    .innerJoin(services, eq(incidents.serviceId, services.id))
    .leftJoin(engineers, eq(incidents.assignedEngineerId, engineers.id))
    .orderBy(desc(incidents.startedAt));
  return rows;
}

export async function getIncidentFull(idOrKey: string): Promise<IncidentFull | null> {
  const incident = await db.query.incidents.findFirst({
    where: (t, { eq: eqOp, or }) => or(eqOp(t.id, idOrKey), eqOp(t.key, idOrKey)),
  });
  if (!incident) return null;

  const [service, engineer, timeline, attemptRows, resolution, metrics] = await Promise.all([
    db.query.services.findFirst({ where: eq(services.id, incident.serviceId) }),
    incident.assignedEngineerId
      ? db.query.engineers.findFirst({ where: eq(engineers.id, incident.assignedEngineerId) })
      : Promise.resolve(null),
    db.query.timelineEvents.findMany({
      where: eq(timelineEvents.incidentId, incident.id),
      orderBy: (t, { asc }) => asc(t.timestamp),
    }),
    db.query.attempts.findMany({
      where: eq(attempts.incidentId, incident.id),
      orderBy: (t, { asc }) => asc(t.orderIndex),
    }),
    db.query.resolutions.findFirst({ where: eq(resolutions.incidentId, incident.id) }),
    db.query.metricSnapshots.findMany({
      where: eq(metricSnapshots.incidentId, incident.id),
      orderBy: (t, { asc }) => asc(t.timestamp),
    }),
  ]);

  if (!service) return null;

  return {
    incident,
    service,
    engineer: engineer ?? null,
    timeline,
    attempts: attemptRows,
    resolution: resolution ?? null,
    metrics,
  };
}

export async function getIncidentSummaryByKey(key: string) {
  const incident = await db.query.incidents.findFirst({ where: eq(incidents.key, key) });
  if (!incident) return null;
  const [service, resolution, attemptRows] = await Promise.all([
    db.query.services.findFirst({ where: eq(services.id, incident.serviceId) }),
    db.query.resolutions.findFirst({ where: eq(resolutions.incidentId, incident.id) }),
    db.query.attempts.findMany({ where: eq(attempts.incidentId, incident.id) }),
  ]);
  if (!service) return null;
  return { incident, service, resolution: resolution ?? null, attempts: attemptRows };
}

export async function listResolvedIncidentsForService(serviceId: string, excludeIncidentId: string) {
  const rows = await db.query.incidents.findMany({
    where: and(eq(incidents.serviceId, serviceId), eq(incidents.status, "resolved"), ne(incidents.id, excludeIncidentId)),
    orderBy: (t, { desc: descOp }) => descOp(t.startedAt),
  });
  return rows;
}
