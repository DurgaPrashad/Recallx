"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SeverityBadge, StatusBadge } from "@/components/ui/badge";
import { formatDuration, serviceColor } from "@/lib/design";
import type { IncidentListItem } from "@/lib/incidents";

export function IncidentGrid({ items, serviceSlugs }: { items: IncidentListItem[]; serviceSlugs: string[] }) {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return items.filter(({ incident, service }) => {
      if (severityFilter !== "all" && incident.severity !== severityFilter) return false;
      if (statusFilter !== "all" && incident.status !== statusFilter) return false;
      if (serviceFilter !== "all" && service.slug !== serviceFilter) return false;
      return true;
    });
  }, [items, severityFilter, statusFilter, serviceFilter]);

  const selectClass =
    "rounded-md border bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] border-[var(--color-border-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className={selectClass}>
          <option value="all">All severities</option>
          <option value="sev1">SEV-1</option>
          <option value="sev2">SEV-2</option>
          <option value="sev3">SEV-3</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="monitoring">Monitoring</option>
          <option value="resolved">Resolved</option>
        </select>
        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className={selectClass}>
          <option value="all">All services</option>
          {serviceSlugs.map((slug) => (
            <option key={slug} value={slug}>
              {slug}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-[var(--color-text-muted)]">
          {filtered.length} of {items.length} incidents
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(({ incident, service, engineer, memoryMatch }) => (
          <Link
            key={incident.id}
            href={`/incidents/${incident.key}`}
            className="group flex flex-col gap-3 rounded-xl border p-4 transition-all hover:-translate-y-0.5"
            style={{
              background: "var(--color-surface-1)",
              borderColor: incident.isHero && incident.status === "active" ? "var(--color-critical)" : "var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: serviceColor(service.slug, serviceSlugs) }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: serviceColor(service.slug, serviceSlugs) }} />
                {service.name}
                <span className="text-[var(--color-text-muted)]">· {incident.key}</span>
              </div>
              <div className="mt-1 text-sm font-semibold leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-strong)]">
                {incident.title}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-lg bg-[var(--color-surface-2)] px-2.5 py-2 text-center">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Error rate</div>
                <div className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">{incident.errorRateCurrent}%</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">p95</div>
                <div className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                  {incident.p95LatencyMs ? `${(incident.p95LatencyMs / 1000).toFixed(1)}s` : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Duration</div>
                <div className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                  {formatDuration(incident.startedAt, incident.resolvedAt)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-text-muted)]">{engineer ? engineer.name : "Unassigned"}</span>
              {memoryMatch != null ? (
                <span
                  className="rounded-md px-2 py-0.5 font-semibold"
                  style={{
                    color: memoryMatch >= 75 ? "var(--color-good)" : memoryMatch >= 45 ? "var(--color-seq-400)" : "var(--color-warning)",
                    background: "var(--color-surface-3)",
                  }}
                >
                  Memory Match: {memoryMatch}%
                </span>
              ) : (
                <span className="rounded-md bg-[var(--color-surface-3)] px-2 py-0.5 text-[var(--color-text-muted)]">Not yet analyzed</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-[var(--color-text-muted)]" style={{ borderColor: "var(--color-border)" }}>
          No incidents match these filters.
        </div>
      )}
    </div>
  );
}
