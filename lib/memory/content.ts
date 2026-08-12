import type { Attempt, Incident, Resolution, Service } from "@/lib/types";

const OUTCOME_LABEL: Record<string, string> = {
  solved: "SOLVED — this fully resolved the incident.",
  partial: "PARTIALLY HELPED — this improved things somewhat but did not fully resolve the incident.",
  failed: "FAILED — this did not help resolve the incident.",
  inconclusive: "INCONCLUSIVE — the effect on the incident was unclear.",
};

/**
 * Renders a troubleshooting attempt as natural-language content for Hindsight's
 * retain() fact extraction. Deliberately explicit about outcome so extraction
 * (and any human skimming the raw memory) can't miss whether this was a dead end.
 */
export function attemptContent(incident: Incident, service: Service, attempt: Attempt): string {
  const lines = [
    `During ${incident.key} (${service.name}, ${incident.severity.toUpperCase()}) — "${incident.title}" — ` +
      `engineers attempted: ${attempt.action}.`,
  ];
  if (attempt.hypothesis) {
    lines.push(`Hypothesis at the time: ${attempt.hypothesis}`);
  }
  lines.push(`Outcome: ${OUTCOME_LABEL[attempt.outcome] ?? attempt.outcome.toUpperCase()}`);
  if (attempt.outcomeNotes) {
    lines.push(`Details: ${attempt.outcomeNotes}`);
  }
  if (attempt.outcome === "failed" || attempt.outcome === "partial") {
    lines.push(
      `This is a dead end for ${service.name} incidents with these symptoms: "${attempt.action}" should not ` +
        `be assumed to fix similar future incidents without new evidence.`
    );
  }
  return lines.join(" ");
}

export function resolutionContent(incident: Incident, service: Service, resolution: Resolution): string {
  const lines = [
    `${incident.key} (${service.name}, ${incident.severity.toUpperCase()}) — "${incident.title}" — was resolved.`,
    `Confirmed root cause: ${resolution.rootCause}`,
    `Successful remediation: ${resolution.fixSummary}`,
  ];
  if (resolution.lessonsLearned) {
    lines.push(`Lessons learned: ${resolution.lessonsLearned}`);
  }
  if (resolution.timeToResolutionMin != null) {
    lines.push(`Time to resolution: ${resolution.timeToResolutionMin} minutes.`);
  }
  return lines.join(" ");
}

export function incidentContextContent(incident: Incident, service: Service): string {
  return (
    `${incident.key} opened on ${service.name} (${incident.severity.toUpperCase()}): ${incident.summary} ` +
    `Symptoms observed: ${incident.symptoms} Alerts fired: ${incident.alerts}` +
    (incident.deployContext ? ` Change/deploy context: ${incident.deployContext}` : "")
  );
}
