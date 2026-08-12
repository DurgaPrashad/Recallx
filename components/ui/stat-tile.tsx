export function StatTile({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl border px-5 py-4"
      style={{ background: "var(--color-surface-1)", borderColor: "var(--color-border)" }}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1.5 text-3xl font-bold tabular-nums" style={{ color: accent ?? "var(--color-text-primary)" }}>
        {value}
      </div>
      {sublabel && <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{sublabel}</div>}
    </div>
  );
}
