import type { AttemptOutcome, IncidentStatus, Severity } from "@/lib/types";

export const SEVERITY_META: Record<Severity, { label: string; color: string; softColor: string; textColor: string }> = {
  sev1: { label: "SEV-1", color: "var(--color-critical)", softColor: "var(--color-critical-soft)", textColor: "var(--color-critical)" },
  sev2: { label: "SEV-2", color: "var(--color-serious)", softColor: "var(--color-serious-soft)", textColor: "var(--color-serious)" },
  sev3: { label: "SEV-3", color: "var(--color-warning)", softColor: "var(--color-warning-soft)", textColor: "var(--color-warning)" },
};

export const STATUS_META: Record<IncidentStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "var(--color-critical)" },
  monitoring: { label: "Monitoring", color: "var(--color-warning)" },
  resolved: { label: "Resolved", color: "var(--color-good)" },
};

export const OUTCOME_META: Record<AttemptOutcome, { label: string; icon: string; color: string; softColor: string }> = {
  solved: { label: "Solved it", icon: "✓", color: "var(--color-good)", softColor: "var(--color-good-soft)" },
  partial: { label: "Partially helped", icon: "△", color: "var(--color-serious)", softColor: "var(--color-serious-soft)" },
  failed: { label: "Didn't help", icon: "✕", color: "var(--color-critical)", softColor: "var(--color-critical-soft)" },
  inconclusive: { label: "Inconclusive", icon: "?", color: "var(--color-text-muted)", softColor: "rgba(122,130,145,0.14)" },
  pending: { label: "Pending", icon: "…", color: "var(--color-text-muted)", softColor: "rgba(122,130,145,0.14)" },
};

export function confidenceColor(pct: number): string {
  if (pct >= 75) return "var(--color-good)";
  if (pct >= 45) return "var(--color-seq-400)";
  if (pct > 0) return "var(--color-warning)";
  return "var(--color-text-muted)";
}

export function confidenceLabel(pct: number): string {
  if (pct >= 75) return "Strong historical match";
  if (pct >= 45) return "Possible match";
  if (pct > 0) return "Weak historical similarity";
  return "Insufficient historical evidence";
}

const SERVICE_CAT_COLORS = [
  "var(--color-cat-1)",
  "var(--color-cat-2)",
  "var(--color-cat-3)",
  "var(--color-cat-4)",
  "var(--color-cat-5)",
  "var(--color-cat-6)",
];

export function serviceColor(slug: string, allSlugsInFixedOrder: string[]): string {
  const idx = allSlugsInFixedOrder.indexOf(slug);
  return SERVICE_CAT_COLORS[idx % SERVICE_CAT_COLORS.length] ?? SERVICE_CAT_COLORS[0]!;
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.round(diffDay / 30);
  return `${diffMonth}mo ago`;
}

export function formatDuration(startIso: string, endIso?: string | null): string {
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const diffMin = Math.max(0, Math.round((end - new Date(startIso).getTime()) / 60_000));
  if (diffMin < 60) return `${diffMin}m`;
  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `${hrs}h ${mins}m`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
