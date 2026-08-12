import type { Incident } from "@/lib/types";

const STOPWORDS = new Set([
  "the",
  "and",
  "with",
  "from",
  "that",
  "this",
  "have",
  "were",
  "been",
  "into",
  "over",
  "after",
  "during",
  "than",
  "then",
  "which",
  "while",
  "some",
  "still",
  "also",
  "shows",
  "showed",
  "began",
  "began",
]);

function significantTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s%.]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4 && !STOPWORDS.has(w))
  );
}

function tokenOverlapCount(a: string, b: string): number {
  const ta = significantTokens(a);
  const tb = significantTokens(b);
  let count = 0;
  for (const t of ta) if (tb.has(t)) count += 1;
  return count;
}

function ratio(a: number | null, b: number | null): number | null {
  if (a == null || b == null || a === 0 || b === 0) return null;
  return Math.min(a, b) / Math.max(a, b);
}

function saturation(used: number | null, limit: number | null): number | null {
  if (used == null || limit == null || limit === 0) return null;
  return used / limit;
}

export interface MatchExplanation {
  matched: string[];
  mismatched: string[];
}

/**
 * Deterministic, explainable comparison between the current incident and the
 * strongest historical match — this is NOT LLM-generated, so it's always
 * consistent and auditable. Mirrors the "Match based on ✓/✕" UI requirement.
 */
export function computeMatchExplanation(current: Incident, matched: Incident): MatchExplanation {
  const result: MatchExplanation = { matched: [], mismatched: [] };

  const sameService = current.serviceId === matched.serviceId;
  (sameService ? result.matched : result.mismatched).push(sameService ? "same service" : "different service");

  const latencyRatio = ratio(current.p95LatencyMs, matched.p95LatencyMs);
  if (latencyRatio !== null) {
    const close = latencyRatio > 0.5;
    (close ? result.matched : result.mismatched).push(
      close ? "similar latency pattern" : "different latency pattern"
    );
  }

  const curSat = saturation(current.dbConnectionsUsed, current.dbConnectionsLimit);
  const matSat = saturation(matched.dbConnectionsUsed, matched.dbConnectionsLimit);
  if (curSat !== null && matSat !== null) {
    const bothSaturated = curSat > 0.8 && matSat > 0.8;
    (bothSaturated ? result.matched : result.mismatched).push(
      bothSaturated ? "database connection saturation" : "connection pool utilization differs"
    );
  }

  const overlap = tokenOverlapCount(
    `${current.symptoms} ${current.alerts}`,
    `${matched.symptoms} ${matched.alerts}`
  );
  const sameSignature = overlap >= 2;
  (sameSignature ? result.matched : result.mismatched).push(
    sameSignature ? "same error signature" : "different error signature"
  );

  const bothDeployed = Boolean(current.deployContext) && Boolean(matched.deployContext);
  const neitherDeployed = !current.deployContext && !matched.deployContext;
  if (bothDeployed) result.matched.push("recent deploy on both incidents");
  else if (!neitherDeployed) result.mismatched.push("different deployment context");

  const sameSeverity = current.severity === matched.severity;
  (sameSeverity ? result.matched : result.mismatched).push(
    sameSeverity ? "same severity class" : "different severity class"
  );

  return result;
}
