import { getIncidentFull, getIncidentSummaryByKey } from "@/lib/incidents";
import { HindsightUnavailableError } from "@/lib/hindsight/client";
import { LlmUnavailableError } from "@/lib/llm/anthropic";
import { gatherEvidence, type EvidenceBundle } from "@/lib/memory/recall-aggregate";
import { sqliteFallbackEvidence } from "@/lib/memory/sqlite-fallback";
import { computeMatchExplanation, type MatchExplanation } from "@/lib/brief/match-explanation";
import { ruleBasedBrief } from "@/lib/brief/rule-based";
import { synthesizeBriefWithClaude } from "@/lib/brief/claude-synthesize";
import type { RecallXBrief } from "@/lib/brief/types";
import { db } from "@/db";
import { briefCache } from "@/db/schema";
import { eq } from "drizzle-orm";

function buildQueryText(incident: { title: string; summary: string; symptoms: string; alerts: string }): string {
  return `${incident.title}. ${incident.summary} Symptoms: ${incident.symptoms} Alerts: ${incident.alerts}`;
}

export interface GenerateBriefOptions {
  /** Restricts evidence to memories tagged demo:N <= this value, for progressive Demo Mode staging. */
  demoOrderMax?: number;
}

export async function generateBrief(incidentKey: string, opts: GenerateBriefOptions = {}): Promise<RecallXBrief> {
  const full = await getIncidentFull(incidentKey);
  if (!full) throw new Error(`Incident not found: ${incidentKey}`);
  const { incident, service } = full;

  let evidence: EvidenceBundle;
  let evidenceSource: "hindsight" | "sqlite";
  try {
    evidence = await gatherEvidence({
      service,
      queryText: buildQueryText(incident),
      excludeIncidentKey: incident.key,
      demoOrderMax: opts.demoOrderMax,
    });
    evidenceSource = "hindsight";
  } catch (err) {
    if (!(err instanceof HindsightUnavailableError)) throw err;
    console.warn(`[brief] Hindsight unavailable for ${incidentKey}, falling back to SQLite ledger`, err.message);
    evidence = await sqliteFallbackEvidence(incident, service, opts.demoOrderMax);
    evidenceSource = "sqlite";
  }

  let matchExplanation: MatchExplanation | null = null;
  const topMatch = evidence.groups[0];
  if (topMatch) {
    const matchedFull = await getIncidentSummaryByKey(topMatch.incidentKey);
    if (matchedFull) matchExplanation = computeMatchExplanation(incident, matchedFull.incident);
  }

  const similarIncidents = evidence.groups.map((g) => ({
    incidentKey: g.incidentKey,
    relevance: Math.round(g.relevance * 100),
    crossService: g.crossService,
  }));

  const similarIncidentDetails = (
    await Promise.all(
      evidence.groups.map(async (g) => {
        const details = await getIncidentSummaryByKey(g.incidentKey);
        if (!details) return null;
        const failedActions = [...new Set(details.attempts.filter((a) => a.outcome === "failed" || a.outcome === "partial").map((a) => a.action))];
        return {
          incidentKey: g.incidentKey,
          title: details.incident.title,
          date: details.incident.startedAt,
          service: details.service.name,
          severity: details.incident.severity,
          relevance: Math.round(g.relevance * 100),
          crossService: g.crossService,
          symptoms: details.incident.symptoms,
          rootCause: details.resolution?.rootCause ?? null,
          fixSummary: details.resolution?.fixSummary ?? null,
          timeToResolutionMin: details.resolution?.timeToResolutionMin ?? null,
          deadEndCount: failedActions.length,
          failedActions,
        };
      })
    )
  ).filter((d): d is NonNullable<typeof d> => d !== null);

  let brief: RecallXBrief;
  try {
    const synthesized = await synthesizeBriefWithClaude(incident, service, evidence);
    brief = {
      ...synthesized,
      incidentKey: incident.key,
      generatedAt: new Date().toISOString(),
      source: "live",
      evidenceSource,
      similarIncidents,
      similarIncidentDetails,
      matchExplanation: matchExplanation ?? { matched: [], mismatched: [] },
    };
  } catch (err) {
    if (!(err instanceof LlmUnavailableError)) throw err;
    console.warn(`[brief] Claude unavailable for ${incidentKey}, falling back to rule-based synthesis`, err.message);
    brief = ruleBasedBrief({
      incident,
      evidence,
      matchExplanation,
      source: evidenceSource === "sqlite" ? "fallback" : "rule-based",
      evidenceSource,
      similarIncidentDetails,
    });
  }

  await db
    .insert(briefCache)
    .values({ incidentId: incident.id, generatedAt: brief.generatedAt, json: JSON.stringify(brief), source: brief.source })
    .onConflictDoUpdate({
      target: briefCache.incidentId,
      set: { generatedAt: brief.generatedAt, json: JSON.stringify(brief), source: brief.source },
    });

  return brief;
}

export async function getCachedBrief(incidentDbId: string): Promise<RecallXBrief | null> {
  const row = await db.query.briefCache.findFirst({ where: eq(briefCache.incidentId, incidentDbId) });
  if (!row) return null;
  try {
    return JSON.parse(row.json) as RecallXBrief;
  } catch {
    return null;
  }
}
