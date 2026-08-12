import type { services, engineers, incidents, metricSnapshots, timelineEvents, attempts, resolutions } from "@/db/schema";

export type Service = typeof services.$inferSelect;
export type Engineer = typeof engineers.$inferSelect;
export type Incident = typeof incidents.$inferSelect;
export type MetricSnapshot = typeof metricSnapshots.$inferSelect;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type Resolution = typeof resolutions.$inferSelect;

export type Severity = "sev1" | "sev2" | "sev3";
export type IncidentStatus = "active" | "monitoring" | "resolved";
export type AttemptOutcome = "solved" | "partial" | "failed" | "inconclusive" | "pending";
export type TimelineEventType = "alert" | "note" | "action" | "observation" | "hypothesis" | "resolution";

export interface IncidentFull {
  incident: Incident;
  service: Service;
  engineer: Engineer | null;
  timeline: TimelineEvent[];
  attempts: Attempt[];
  resolution: Resolution | null;
  metrics: MetricSnapshot[];
}
