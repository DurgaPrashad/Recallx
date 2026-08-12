import * as hindsight from "@/lib/hindsight/client";
import { parseTags, tags as tagBuilders } from "@/lib/memory/tags";
import type { Service } from "@/lib/types";

export type FactKind =
  | "context"
  | "attempt-failed"
  | "attempt-partial"
  | "attempt-success"
  | "attempt-inconclusive"
  | "resolution"
  | "unknown";

export interface EvidenceFact {
  id: string;
  text: string;
  kind: FactKind;
  incidentKey: string;
  service: string;
  severity: string;
  occurredAt: string | null;
  score: number;
  crossService: boolean;
  /** Exact action/fix label (from retain metadata, not LLM-paraphrased text) — used to cluster dead ends/fixes across incidents. */
  actionKey: string;
}

export interface IncidentEvidenceGroup {
  incidentKey: string;
  service: string;
  severity: string;
  relevance: number;
  crossService: boolean;
  facts: EvidenceFact[];
}

export interface AggregatedAction {
  normalizedAction: string;
  displayAction: string;
  count: number;
  incidentKeys: string[];
  exampleText: string;
}

export interface EvidenceBundle {
  groups: IncidentEvidenceGroup[];
  deadEnds: AggregatedAction[];
  whatWorked: AggregatedAction[];
  totalFactsConsidered: number;
}

function normalizeAction(actionKey: string): string {
  return actionKey
    .toLowerCase()
    .replace(/[.:;,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function factKindFromResult(kindRaw: string | undefined): FactKind {
  switch (kindRaw) {
    case "attempt-failed":
    case "attempt-partial":
    case "attempt-success":
    case "attempt-inconclusive":
    case "resolution":
    case "context":
      return kindRaw;
    default:
      return "unknown";
  }
}

export interface GatherEvidenceParams {
  service: Service;
  queryText: string;
  excludeIncidentKey?: string;
  /** Restrict evidence to memories tagged with demo:N where N <= this, for progressive Demo Mode. */
  demoOrderMax?: number;
  budget?: "low" | "mid" | "high";
}

/**
 * Queries Hindsight for evidence relevant to the current incident, combining a
 * service-scoped recall (primary signal) with an unscoped cross-service recall
 * (catches the same failure pattern showing up in a different service), then
 * reconstructs per-incident evidence groups and cross-incident dead-end /
 * what-worked aggregates for the Recall-X Brief.
 */
export async function gatherEvidence(params: GatherEvidenceParams): Promise<EvidenceBundle> {
  const { service, queryText, excludeIncidentKey, demoOrderMax, budget = "high" } = params;

  const [serviceScoped, crossService] = await Promise.all([
    hindsight.recall({
      query: queryText,
      tags: [tagBuilders.service(service.slug)],
      tagsMatch: "any",
      budget,
    }),
    hindsight.recall({
      query: queryText,
      budget: budget === "high" ? "mid" : budget,
    }),
  ]);

  const seen = new Map<string, EvidenceFact>();

  const ingest = (results: typeof serviceScoped.results, forceCrossService: boolean) => {
    for (const r of results) {
      if (seen.has(r.id)) continue;
      const meta = r.metadata ?? {};
      const parsedTags = parseTags(r.tags);
      const incidentKey = meta.incident_id ?? parsedTags.incident;
      if (!incidentKey) continue;
      if (excludeIncidentKey && incidentKey === excludeIncidentKey) continue;
      if (demoOrderMax != null) {
        const demoOrder = Number(parsedTags.demo);
        if (Number.isFinite(demoOrder) && demoOrder > demoOrderMax) continue;
      }
      const svc = meta.service ?? parsedTags.service ?? "unknown";
      const kind = factKindFromResult(parsedTags.kind);
      const actionKey = meta.action ?? meta.fix_summary ?? r.text.slice(0, 80);
      seen.set(r.id, {
        id: r.id,
        text: r.text,
        kind,
        incidentKey,
        service: svc,
        severity: meta.severity ?? parsedTags.severity ?? "unknown",
        occurredAt: r.occurred_start ?? null,
        score: r.scores?.final ?? 0,
        crossService: forceCrossService || svc !== service.slug,
        actionKey,
      });
    }
  };

  ingest(serviceScoped.results, false);
  ingest(crossService.results, true);

  return buildEvidenceBundle([...seen.values()]);
}

/**
 * Groups a flat list of evidence facts into per-incident groups plus
 * cross-incident dead-end / what-worked aggregates. Shared by the Hindsight
 * recall path and the SQLite fallback path so both produce the same shape.
 */
export function buildEvidenceBundle(facts: EvidenceFact[]): EvidenceBundle {
  const groupsByIncident = new Map<string, IncidentEvidenceGroup>();
  for (const fact of facts) {
    let group = groupsByIncident.get(fact.incidentKey);
    if (!group) {
      group = {
        incidentKey: fact.incidentKey,
        service: fact.service,
        severity: fact.severity,
        relevance: 0,
        crossService: fact.crossService,
        facts: [],
      };
      groupsByIncident.set(fact.incidentKey, group);
    }
    group.facts.push(fact);
    group.relevance = Math.max(group.relevance, fact.score);
    group.crossService = group.crossService && fact.crossService;
  }

  const groups = [...groupsByIncident.values()].sort((a, b) => b.relevance - a.relevance).slice(0, 8);

  const deadEndMap = new Map<string, AggregatedAction>();
  const workedMap = new Map<string, AggregatedAction>();

  for (const fact of facts) {
    if (fact.kind === "attempt-failed" || fact.kind === "attempt-partial") {
      const key = normalizeAction(fact.actionKey);
      const existing = deadEndMap.get(key);
      if (existing) {
        if (!existing.incidentKeys.includes(fact.incidentKey)) existing.incidentKeys.push(fact.incidentKey);
      } else {
        deadEndMap.set(key, {
          normalizedAction: key,
          displayAction: fact.actionKey.trim(),
          count: 0,
          incidentKeys: [fact.incidentKey],
          exampleText: fact.text,
        });
      }
    } else if (fact.kind === "attempt-success" || fact.kind === "resolution") {
      const key = normalizeAction(fact.actionKey);
      const existing = workedMap.get(key);
      if (existing) {
        if (!existing.incidentKeys.includes(fact.incidentKey)) existing.incidentKeys.push(fact.incidentKey);
      } else {
        workedMap.set(key, {
          normalizedAction: key,
          displayAction: fact.actionKey.trim(),
          count: 0,
          incidentKeys: [fact.incidentKey],
          exampleText: fact.text,
        });
      }
    }
  }

  const finalize = (m: Map<string, AggregatedAction>) =>
    [...m.values()]
      .map((a) => ({ ...a, count: a.incidentKeys.length }))
      .sort((a, b) => b.count - a.count);

  return {
    groups,
    deadEnds: finalize(deadEndMap),
    whatWorked: finalize(workedMap),
    totalFactsConsidered: facts.length,
  };
}
