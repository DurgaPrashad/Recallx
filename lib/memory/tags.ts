import type { AttemptOutcome } from "@/lib/types";

export const tags = {
  service: (slug: string) => `service:${slug}`,
  incident: (key: string) => `incident:${key}`,
  severity: (sev: string) => `severity:${sev}`,
  kind: (k: KindTag) => `kind:${k}`,
  pattern: (slug: string) => `pattern:${slug}`,
  demoOrder: (n: number) => `demo:${n}`,
};

export type KindTag =
  | "attempt-failed"
  | "attempt-partial"
  | "attempt-success"
  | "attempt-inconclusive"
  | "resolution"
  | "context";

export function outcomeToKind(outcome: AttemptOutcome): KindTag {
  switch (outcome) {
    case "solved":
      return "attempt-success";
    case "partial":
      return "attempt-partial";
    case "failed":
      return "attempt-failed";
    default:
      return "attempt-inconclusive";
  }
}

/** Parses a `key:value` memory tag list back into a lookup map (first value wins per key). */
export function parseTags(tagList: string[] | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of tagList ?? []) {
    const idx = t.indexOf(":");
    if (idx === -1) continue;
    const key = t.slice(0, idx);
    if (!(key in out)) out[key] = t.slice(idx + 1);
  }
  return out;
}
