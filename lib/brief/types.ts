export interface RecallXBrief {
  incidentKey: string;
  generatedAt: string;
  source: "live" | "rule-based" | "fallback";
  /** Which system produced the underlying evidence — drives the "memory service unavailable" banner. */
  evidenceSource: "hindsight" | "sqlite";
  overallConfidence: number; // 0-100
  confidenceLabel: "strong" | "possible" | "weak" | "insufficient";
  probableCause: {
    cause: string;
    confidence: number; // 0-100
    explanation: string;
    evidenceIncidentKeys: string[];
  } | null;
  checkFirst: Array<{
    step: string;
    why: string;
    evidenceIncidentKeys: string[];
  }>;
  dontTryAgain: Array<{
    action: string;
    failureSummary: string;
    attemptedInIncidentKeys: string[];
    outcomeBreakdown: { failed: number; partial: number };
  }>;
  whatWorkedBefore: Array<{
    action: string;
    successSummary: string;
    incidentKeys: string[];
  }>;
  similarIncidents: Array<{
    incidentKey: string;
    relevance: number; // 0-100
    crossService: boolean;
  }>;
  similarIncidentDetails: Array<{
    incidentKey: string;
    title: string;
    date: string;
    service: string;
    severity: string;
    relevance: number;
    crossService: boolean;
    symptoms: string;
    rootCause: string | null;
    fixSummary: string | null;
    timeToResolutionMin: number | null;
    deadEndCount: number;
    failedActions: string[];
  }>;
  matchExplanation: {
    matched: string[];
    mismatched: string[];
  };
  uncertaintyNote: string | null;
}
