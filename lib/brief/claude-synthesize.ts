import { completeJson } from "@/lib/llm/anthropic";
import type { EvidenceBundle } from "@/lib/memory/recall-aggregate";
import type { Incident, Service } from "@/lib/types";
import type { MatchExplanation } from "@/lib/brief/match-explanation";
import type { RecallXBrief } from "@/lib/brief/types";

const SYSTEM_PROMPT = `You are Recall-X, an on-call incident copilot with persistent memory of past production incidents.

Your defining trait: you remember what DIDN'T work, not just what did. Engineers rely on you to stop them
from re-trying troubleshooting steps that already failed in similar past incidents.

Rules you must follow:
1. Only cite incident keys (e.g. "INC-1042") that appear in the evidence provided to you. Never invent an
   incident ID, a metric, or a quote.
2. Past correlation is not proof of the same root cause. If the evidence is thin, conflicting, or only
   superficially similar, say so explicitly and lower your confidence rather than presenting a guess as fact.
3. Do not recommend destructive remediation (restarts, rollbacks, scaling changes) as a first step — recommend
   investigation/verification first unless the evidence strongly and consistently supports a specific fix.
4. Be concise and specific. Never write generic advice like "check the logs" — ground every recommendation in
   the evidence you were given.
5. Respond with ONLY a single JSON object matching the schema you are given. No prose outside the JSON.`;

interface ClaudeBriefOutput {
  overallConfidence: number;
  confidenceLabel: "strong" | "possible" | "weak" | "insufficient";
  probableCause: {
    cause: string;
    confidence: number;
    explanation: string;
    evidenceIncidentKeys: string[];
  } | null;
  checkFirst: Array<{ step: string; why: string; evidenceIncidentKeys: string[] }>;
  dontTryAgainSelection: Array<{ normalizedAction: string; failureSummary: string }>;
  whatWorkedSelection: Array<{ normalizedAction: string; successSummary: string }>;
  uncertaintyNote: string | null;
}

function buildPrompt(incident: Incident, service: Service, evidence: EvidenceBundle): string {
  const evidenceBlock = evidence.groups
    .map((g) => {
      const facts = g.facts
        .slice(0, 6)
        .map((f) => `    - [${f.kind}] (${Math.round(f.score * 100)}% match) ${f.text}`)
        .join("\n");
      return `  ${g.incidentKey} — service: ${g.service}, severity: ${g.severity}, relevance: ${Math.round(
        g.relevance * 100
      )}%${g.crossService ? ", CROSS-SERVICE MATCH" : ""}\n${facts}`;
    })
    .join("\n\n");

  const deadEndsBlock = evidence.deadEnds
    .map(
      (d) =>
        `  - normalizedAction: "${d.normalizedAction}" | attempted in ${d.count} incident(s): ${d.incidentKeys.join(
          ", "
        )} | example: ${d.exampleText}`
    )
    .join("\n");

  const workedBlock = evidence.whatWorked
    .map(
      (w) =>
        `  - normalizedAction: "${w.normalizedAction}" | worked in ${w.count} incident(s): ${w.incidentKeys.join(
          ", "
        )} | example: ${w.exampleText}`
    )
    .join("\n");

  return `CURRENT INCIDENT
Key: ${incident.key}
Service: ${service.name} (${service.slug})
Severity: ${incident.severity}
Title: ${incident.title}
Summary: ${incident.summary}
Symptoms: ${incident.symptoms}
Alerts: ${incident.alerts}
Deploy/change context: ${incident.deployContext ?? "none noted"}
Error rate: ${incident.errorRateStart}% → ${incident.errorRatePeak}% (current: ${incident.errorRateCurrent}%)
p95 latency: ${incident.p95LatencyMs}ms
DB connections: ${incident.dbConnectionsUsed}/${incident.dbConnectionsLimit}

RETRIEVED HISTORICAL EVIDENCE (from Hindsight memory, grouped by incident)
${evidenceBlock || "  (no matching historical evidence found)"}

AGGREGATED DEAD ENDS ACROSS MATCHED INCIDENTS (candidates for dontTryAgainSelection — you may only reference these exact normalizedAction strings)
${deadEndsBlock || "  (none)"}

AGGREGATED SUCCESSFUL ACTIONS ACROSS MATCHED INCIDENTS (candidates for whatWorkedSelection — you may only reference these exact normalizedAction strings)
${workedBlock || "  (none)"}

TASK
Produce a JSON object with this exact shape:
{
  "overallConfidence": number 0-100 (how confident should the engineer be in the probable cause, given ALL evidence),
  "confidenceLabel": "strong" | "possible" | "weak" | "insufficient",
  "probableCause": { "cause": string, "confidence": number 0-100, "explanation": string (1-2 sentences), "evidenceIncidentKeys": string[] } or null if evidence is insufficient to name one,
  "checkFirst": array of 2-4 { "step": string (specific, actionable, not generic), "why": string, "evidenceIncidentKeys": string[] },
  "dontTryAgainSelection": array of the most relevant items from the dead-ends list above, each { "normalizedAction": string (must exactly match one from the list), "failureSummary": string (1 sentence, specific) },
  "whatWorkedSelection": array of the most relevant items from the successful-actions list above, each { "normalizedAction": string (must exactly match one from the list), "successSummary": string (1 sentence) },
  "uncertaintyNote": string or null — call out conflicting evidence, thin evidence, or incidents that look similar but had different root causes
}`;
}

const RESPONSE_SCHEMA_HINT = `Reply with raw JSON only, no markdown fences.`;

export async function synthesizeBriefWithClaude(
  incident: Incident,
  service: Service,
  evidence: EvidenceBundle
): Promise<
  Omit<RecallXBrief, "incidentKey" | "generatedAt" | "source" | "evidenceSource" | "similarIncidents" | "similarIncidentDetails" | "matchExplanation">
> {
  const prompt = `${buildPrompt(incident, service, evidence)}\n\n${RESPONSE_SCHEMA_HINT}`;
  const raw = await completeJson<ClaudeBriefOutput>({ system: SYSTEM_PROMPT, prompt, maxTokens: 2048 });

  const validIncidentKeys = new Set(evidence.groups.map((g) => g.incidentKey));
  const deadEndByAction = new Map(evidence.deadEnds.map((d) => [d.normalizedAction, d]));
  const workedByAction = new Map(evidence.whatWorked.map((w) => [w.normalizedAction, w]));

  const probableCause = raw.probableCause
    ? {
        ...raw.probableCause,
        evidenceIncidentKeys: raw.probableCause.evidenceIncidentKeys.filter((k) => validIncidentKeys.has(k)),
      }
    : null;
  const cleanedProbableCause =
    probableCause && probableCause.evidenceIncidentKeys.length === 0 ? null : probableCause;

  const checkFirst = raw.checkFirst.map((c) => ({
    ...c,
    evidenceIncidentKeys: c.evidenceIncidentKeys.filter((k) => validIncidentKeys.has(k)),
  }));

  const dontTryAgain = raw.dontTryAgainSelection
    .map((sel) => {
      const match = deadEndByAction.get(sel.normalizedAction);
      if (!match) return null;
      return {
        action: match.displayAction,
        failureSummary: sel.failureSummary,
        attemptedInIncidentKeys: match.incidentKeys,
        outcomeBreakdown: { failed: match.incidentKeys.length, partial: 0 },
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const whatWorkedBefore = raw.whatWorkedSelection
    .map((sel) => {
      const match = workedByAction.get(sel.normalizedAction);
      if (!match) return null;
      return {
        action: match.displayAction,
        successSummary: sel.successSummary,
        incidentKeys: match.incidentKeys,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return {
    overallConfidence: Math.max(0, Math.min(100, Math.round(raw.overallConfidence))),
    confidenceLabel: raw.confidenceLabel,
    probableCause: cleanedProbableCause,
    checkFirst,
    dontTryAgain,
    whatWorkedBefore,
    uncertaintyNote: raw.uncertaintyNote,
  };
}
