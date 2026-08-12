import type { AttemptOutcome, IncidentStatus, Severity } from "@/lib/types";
import { OUTCOME_META, SEVERITY_META, STATUS_META } from "@/lib/design";

export function SeverityBadge({ severity, className = "" }: { severity: Severity; className?: string }) {
  const meta = SEVERITY_META[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide ${className}`}
      style={{ background: meta.softColor, color: meta.textColor }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium" style={{ color: meta.color }}>
      {status === "active" && <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full" style={{ background: meta.color }} />}
      {status !== "active" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />}
      {meta.label}
    </span>
  );
}

export function OutcomeBadge({ outcome }: { outcome: AttemptOutcome }) {
  const meta = OUTCOME_META[outcome];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
      style={{ background: meta.softColor, color: meta.color }}
    >
      <span>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

export function Pill({
  children,
  tone = "default",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "default" | "accent" | "muted";
  className?: string;
}) {
  const toneStyle =
    tone === "accent"
      ? { background: "var(--color-accent-soft)", color: "var(--color-accent-strong)" }
      : tone === "muted"
        ? { background: "var(--color-surface-3)", color: "var(--color-text-muted)" }
        : { background: "var(--color-surface-3)", color: "var(--color-text-secondary)" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${className}`} style={toneStyle}>
      {children}
    </span>
  );
}
