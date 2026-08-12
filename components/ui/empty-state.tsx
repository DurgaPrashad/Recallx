import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center" style={{ borderColor: "var(--color-border)" }}>
      {icon && <div className="mb-1 text-[var(--color-text-muted)]">{icon}</div>}
      <div className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</div>
      {description && <div className="max-w-sm text-sm text-[var(--color-text-muted)]">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
