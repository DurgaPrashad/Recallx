import * as hindsight from "@/lib/hindsight/client";
import { attemptContent, incidentContextContent, resolutionContent } from "@/lib/memory/content";
import { outcomeToKind, tags } from "@/lib/memory/tags";
import type { Attempt, Incident, Resolution, Service } from "@/lib/types";

function baseTags(incident: Incident, service: Service): string[] {
  const list = [tags.service(service.slug), tags.incident(incident.key), tags.severity(incident.severity)];
  if (incident.patternTag) list.push(tags.pattern(incident.patternTag));
  if (incident.demoOrder != null) list.push(tags.demoOrder(incident.demoOrder));
  return list;
}

export async function retainIncidentContext(
  incident: Incident,
  service: Service,
  timestamp?: string
): Promise<void> {
  await hindsight.retain({
    content: incidentContextContent(incident, service),
    context: `incident-context:${incident.key}`,
    timestamp: timestamp ?? incident.startedAt,
    tags: [...baseTags(incident, service), tags.kind("context")],
    metadata: {
      incident_id: incident.key,
      service: service.slug,
      severity: incident.severity,
      kind: "context",
    },
  });
}

export async function retainAttempt(
  incident: Incident,
  service: Service,
  attempt: Attempt,
  timestamp?: string
): Promise<void> {
  await hindsight.retain({
    content: attemptContent(incident, service, attempt),
    context: `attempt:${incident.key}:${attempt.id}`,
    timestamp: timestamp ?? attempt.endedAt ?? attempt.startedAt,
    tags: [...baseTags(incident, service), tags.kind(outcomeToKind(attempt.outcome))],
    metadata: {
      incident_id: incident.key,
      service: service.slug,
      severity: incident.severity,
      kind: "attempt",
      outcome: attempt.outcome,
      action: attempt.action.slice(0, 200),
    },
  });
}

export async function retainResolution(
  incident: Incident,
  service: Service,
  resolution: Resolution,
  timestamp?: string
): Promise<void> {
  await hindsight.retain({
    content: resolutionContent(incident, service, resolution),
    context: `resolution:${incident.key}`,
    timestamp: timestamp ?? resolution.createdAt,
    tags: [...baseTags(incident, service), tags.kind("resolution")],
    metadata: {
      incident_id: incident.key,
      service: service.slug,
      severity: incident.severity,
      kind: "resolution",
      root_cause: resolution.rootCause.slice(0, 200),
      fix_summary: resolution.fixSummary.slice(0, 200),
    },
  });
}
