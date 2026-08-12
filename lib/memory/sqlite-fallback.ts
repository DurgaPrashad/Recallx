import { attemptContent, resolutionContent } from "@/lib/memory/content";
import { buildEvidenceBundle, type EvidenceBundle, type EvidenceFact } from "@/lib/memory/recall-aggregate";
import { listResolvedIncidentsForService } from "@/lib/incidents";
import { db } from "@/db";
import { attempts, resolutions } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Incident, Service } from "@/lib/types";

/**
 * Reconstructs an evidence bundle straight from the local SQLite ledger when
 * Hindsight is unreachable. Every attempt/resolution retained into Hindsight
 * was first written here, so this is a real (if less intelligent — no
 * semantic ranking, just same-service/same-pattern matching) approximation,
 * not fabricated data.
 */
export async function sqliteFallbackEvidence(
  incident: Incident,
  service: Service,
  demoOrderMax?: number
): Promise<EvidenceBundle> {
  const allCandidates = await listResolvedIncidentsForService(service.id, incident.id);
  const candidates = demoOrderMax != null ? allCandidates.filter((c) => c.demoOrder <= demoOrderMax) : allCandidates;
  const facts: EvidenceFact[] = [];

  for (const candidate of candidates) {
    const samePattern = incident.patternTag && candidate.patternTag === incident.patternTag;
    const baseScore = samePattern ? 0.82 : 0.48;
    const [attemptRows, resolution] = await Promise.all([
      db.query.attempts.findMany({ where: eq(attempts.incidentId, candidate.id) }),
      db.query.resolutions.findFirst({ where: eq(resolutions.incidentId, candidate.id) }),
    ]);

    for (const attempt of attemptRows) {
      if (attempt.outcome === "pending") continue;
      const kind =
        attempt.outcome === "solved"
          ? "attempt-success"
          : attempt.outcome === "partial"
            ? "attempt-partial"
            : attempt.outcome === "failed"
              ? "attempt-failed"
              : "attempt-inconclusive";
      facts.push({
        id: attempt.id,
        text: attemptContent(candidate, service, attempt),
        kind,
        incidentKey: candidate.key,
        service: service.slug,
        severity: candidate.severity,
        occurredAt: attempt.startedAt,
        score: baseScore,
        crossService: false,
        actionKey: attempt.action,
      });
    }

    if (resolution) {
      facts.push({
        id: resolution.id,
        text: resolutionContent(candidate, service, resolution),
        kind: "resolution",
        incidentKey: candidate.key,
        service: service.slug,
        severity: candidate.severity,
        occurredAt: resolution.createdAt,
        score: baseScore,
        crossService: false,
        actionKey: resolution.fixSummary,
      });
    }
  }

  return buildEvidenceBundle(facts);
}
