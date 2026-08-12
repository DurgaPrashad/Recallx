import { confidenceColor, confidenceLabel } from "@/lib/design";

export function ConfidenceMeter({
  value,
  label,
  size = "md",
}: {
  value: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const pct = Math.max(0, Math.min(100, value));
  const color = confidenceColor(pct);
  const barHeight = size === "lg" ? "h-2.5" : size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className={`font-bold tabular-nums ${size === "lg" ? "text-3xl" : "text-base"}`} style={{ color }}>
          {pct}%
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">{label ?? confidenceLabel(pct)}</span>
      </div>
      <div className={`w-full overflow-hidden rounded-full bg-[var(--color-surface-3)] ${barHeight}`}>
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
