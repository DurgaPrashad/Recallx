import type { EvidenceBundle } from "@/lib/memory/recall-aggregate";
import type { Incident } from "@/lib/types";
import type { MatchExplanation } from "@/lib/brief/match-explanation";
import type { RecallXBrief } from "@/lib/brief/types";

function truncate(text: string, max = 220): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
}

function confidenceLabel(score: number): RecallXBrief["confidenceLabel"] {
  if (score >= 75) return "strong";
  if (score >= 45) return "possible";
  if (score > 0) return "weak";
  return "insufficient";
}

/**
 * Deterministic (non-LLM) Brief synthesis. Used when Claude is unavailable —
 * every field is still grounded in real retrieved evidence, just templated
 * instead of narrated. Guarantees the app is never blank even without an
 * LLM key configured.
 */
export function ruleBasedBrief(params: {
  incident: Incident;
  evidence: EvidenceBundle;
  matchExplanation: MatchExplanation | null;
  source: "rule-based" | "fallback";
  evidenceSource: "hindsight" | "sqlite";
  similarIncidentDetails: RecallXBrief["similarIncidentDetails"];
}): RecallXBrief {
  const { incident, evidence, matchExplanation, source, evidenceSource, similarIncidentDetails } = params;
  const topGroups = evidence.groups.slice(0, 3);
  const overallConfidence = Math.round((topGroups[0]?.relevance ?? 0) * 100);

  const resolutionFact = topGroups
    .flatMap((g) => g.facts.map((f) => ({ ...f, group: g })))
    .filter((f) => f.kind === "resolution")
    .sort((a, b) => b.score - a.score)[0];

  const probableCause = resolutionFact
    ? {
        cause: truncate(resolutionFact.text),
        confidence: Math.round(resolutionFact.score * 100),
        explanation: `Based on ${resolutionFact.incidentKey}, the strongest historical match (${Math.round(
          resolutionFact.score * 100
        )}% relevance).`,
        evidenceIncidentKeys: [resolutionFact.incidentKey],
      }
    : null;

  const checkFirst = topGroups
    .map((g) => {
      const best = [...g.facts].sort((a, b) => b.score - a.score)[0];
      if (!best) return null;
      return {
        step: truncate(best.text, 160),
        why: `Surfaced from ${g.incidentKey} (${Math.round(g.relevance * 100)}% match).`,
        evidenceIncidentKeys: [g.incidentKey],
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 4);

  const dontTryAgain = evidence.deadEnds.slice(0, 6).map((d) => ({
    action: truncate(d.displayAction, 120),
    failureSummary: truncate(d.exampleText, 200),
    attemptedInIncidentKeys: d.incidentKeys,
    outcomeBreakdown: { failed: d.incidentKeys.length, partial: 0 },
  }));

  const whatWorkedBefore = evidence.whatWorked.slice(0, 6).map((w) => ({
    action: truncate(w.displayAction, 120),
    successSummary: truncate(w.exampleText, 200),
    incidentKeys: w.incidentKeys,
  }));

  const similarIncidents = evidence.groups.map((g) => ({
    incidentKey: g.incidentKey,
    relevance: Math.round(g.relevance * 100),
    crossService: g.crossService,
  }));

  const uncertaintyNote =
    evidence.groups.length === 0
      ? "No sufficiently similar historical incidents were found. Treat this as a fresh investigation — Recall-X has little relevant memory yet."
      : source === "fallback"
        ? "Memory service (Hindsight) is unreachable — this analysis was reconstructed from Recall-X's local incident ledger and may be less precise than a full memory recall."
        : evidence.groups.length === 1
          ? "Only one historical incident matched — treat the probable cause as a hypothesis to verify, not a confirmed diagnosis."
          : null;

  return {
    incidentKey: incident.key,
    generatedAt: new Date().toISOString(),
    source,
    evidenceSource,
    overallConfidence,
    confidenceLabel: confidenceLabel(overallConfidence),
    probableCause,
    checkFirst,
    dontTryAgain,
    whatWorkedBefore,
    similarIncidents,
    similarIncidentDetails,
    matchExplanation: matchExplanation ?? { matched: [], mismatched: [] },
    uncertaintyNote,
  };
}
