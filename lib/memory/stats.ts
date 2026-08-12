import { db, ensureDbReady } from "@/db";

export interface MemoryStats {
  incidentsRemembered: number;
  troubleshootingAttempts: number;
  deadEndsLearned: number;
  verifiedFixes: number;
  recurringPatterns: number;
  servicesWithMemory: number;
  totalServices: number;
  /** Attempts/resolutions captured locally but not yet confirmed synced to the live Hindsight bank. */
  pendingHindsightSync: number;
}

export async function computeMemoryStats(): Promise<MemoryStats> {
  await ensureDbReady();
  const allIncidents = await db.query.incidents.findMany();
  const allAttempts = await db.query.attempts.findMany();
  const allResolutions = await db.query.resolutions.findMany();
  const allServices = await db.query.services.findMany();

  // "Remembered" reflects Recall-X's local ledger (what has actually been taught),
  // independent of whether the write to Hindsight itself has been confirmed —
  // that sync state is surfaced separately so it doesn't make otherwise-real
  // captured lessons look like they don't exist when Hindsight is briefly offline.
  const rememberedIncidentIds = new Set<string>();
  for (const a of allAttempts) if (a.outcome !== "pending") rememberedIncidentIds.add(a.incidentId);
  for (const r of allResolutions) rememberedIncidentIds.add(r.incidentId);

  const pendingHindsightSync =
    allAttempts.filter((a) => a.outcome !== "pending" && !a.memorySynced).length +
    allResolutions.filter((r) => !r.memorySynced).length;

  const patternCounts = new Map<string, number>();
  for (const inc of allIncidents) {
    if (!inc.patternTag) continue;
    patternCounts.set(inc.patternTag, (patternCounts.get(inc.patternTag) ?? 0) + 1);
  }
  const recurringPatterns = [...patternCounts.values()].filter((c) => c >= 2).length;

  const servicesWithMemoryIds = new Set(allIncidents.filter((i) => rememberedIncidentIds.has(i.id)).map((i) => i.serviceId));

  return {
    incidentsRemembered: rememberedIncidentIds.size,
    troubleshootingAttempts: allAttempts.filter((a) => a.outcome !== "pending").length,
    deadEndsLearned: allAttempts.filter((a) => a.outcome === "failed" || a.outcome === "partial").length,
    verifiedFixes: allResolutions.length,
    recurringPatterns,
    servicesWithMemory: servicesWithMemoryIds.size,
    totalServices: allServices.length,
    pendingHindsightSync,
  };
}

export interface RecurringPattern {
  patternTag: string;
  incidentCount: number;
  services: string[];
  incidentKeys: string[];
}

export async function computeRecurringPatterns(): Promise<RecurringPattern[]> {
  await ensureDbReady();
  const allIncidents = await db.query.incidents.findMany();
  const allServices = await db.query.services.findMany();
  const serviceById = new Map(allServices.map((s) => [s.id, s.name]));

  const groups = new Map<string, RecurringPattern>();
  for (const inc of allIncidents) {
    if (!inc.patternTag) continue;
    let g = groups.get(inc.patternTag);
    if (!g) {
      g = { patternTag: inc.patternTag, incidentCount: 0, services: [], incidentKeys: [] };
      groups.set(inc.patternTag, g);
    }
    g.incidentCount += 1;
    g.incidentKeys.push(inc.key);
    const svcName = serviceById.get(inc.serviceId);
    if (svcName && !g.services.includes(svcName)) g.services.push(svcName);
  }

  return [...groups.values()].filter((g) => g.incidentCount >= 2).sort((a, b) => b.incidentCount - a.incidentCount);
}

export interface ServiceMemorySummary {
  slug: string;
  name: string;
  incidentCount: number;
  deadEndCount: number;
  fixCount: number;
}

export async function computeServiceMemorySummaries(): Promise<ServiceMemorySummary[]> {
  await ensureDbReady();
  const allServices = await db.query.services.findMany();
  const allIncidents = await db.query.incidents.findMany();
  const allAttempts = await db.query.attempts.findMany();
  const allResolutions = await db.query.resolutions.findMany();

  const incidentById = new Map(allIncidents.map((i) => [i.id, i]));

  return allServices.map((svc) => {
    const svcIncidents = allIncidents.filter((i) => i.serviceId === svc.id);
    const svcIncidentIds = new Set(svcIncidents.map((i) => i.id));
    const deadEndCount = allAttempts.filter(
      (a) => svcIncidentIds.has(a.incidentId) && (a.outcome === "failed" || a.outcome === "partial")
    ).length;
    const fixCount = allResolutions.filter((r) => svcIncidentIds.has(r.incidentId)).length;
    return { slug: svc.slug, name: svc.name, incidentCount: svcIncidents.length, deadEndCount, fixCount };
  });
}

export interface DeadEndEntry {
  action: string;
  attemptedCount: number;
  solvedCount: number;
  partialCount: number;
  failedCount: number;
  associatedPatterns: string[];
  incidentKeys: string[];
}

export async function computeDeadEndLibrary(): Promise<DeadEndEntry[]> {
  await ensureDbReady();
  const allAttempts = await db.query.attempts.findMany();
  const allIncidents = await db.query.incidents.findMany();
  const incidentById = new Map(allIncidents.map((i) => [i.id, i]));

  const groups = new Map<string, DeadEndEntry>();
  for (const a of allAttempts) {
    if (a.outcome === "pending") continue;
    const key = a.action.trim().toLowerCase();
    let g = groups.get(key);
    if (!g) {
      g = { action: a.action.trim(), attemptedCount: 0, solvedCount: 0, partialCount: 0, failedCount: 0, associatedPatterns: [], incidentKeys: [] };
      groups.set(key, g);
    }
    g.attemptedCount += 1;
    if (a.outcome === "solved") g.solvedCount += 1;
    else if (a.outcome === "partial") g.partialCount += 1;
    else if (a.outcome === "failed") g.failedCount += 1;
    const incident = incidentById.get(a.incidentId);
    if (incident) {
      if (!g.incidentKeys.includes(incident.key)) g.incidentKeys.push(incident.key);
      if (incident.patternTag && !g.associatedPatterns.includes(incident.patternTag)) g.associatedPatterns.push(incident.patternTag);
    }
  }

  return [...groups.values()]
    .filter((g) => g.failedCount + g.partialCount > 0)
    .sort((a, b) => b.attemptedCount - a.attemptedCount);
}
