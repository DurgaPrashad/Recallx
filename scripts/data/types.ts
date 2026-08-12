export interface SeedAttempt {
  action: string;
  hypothesis?: string;
  outcome: "solved" | "partial" | "failed" | "inconclusive";
  outcomeNotes: string;
  startMinute: number;
  endMinute: number;
}

export interface SeedResolution {
  rootCause: string;
  fixSummary: string;
  lessonsLearned: string;
  resolvedMinute?: number;
}

export interface SeedIncident {
  key: string;
  service: string;
  severity: "sev1" | "sev2" | "sev3";
  title: string;
  summary: string;
  symptoms: string;
  alerts: string;
  deployContext?: string;
  errorRateStart: number;
  errorRatePeak: number;
  errorRateCurrent: number;
  p95LatencyMs: number;
  dbConnectionsUsed?: number;
  dbConnectionsLimit?: number;
  daysAgo: number;
  hour: number;
  status: "resolved" | "active" | "monitoring";
  patternTag?: string;
  isHero?: boolean;
  assignedEngineer: string;
  attempts: SeedAttempt[];
  resolution?: SeedResolution;
}
