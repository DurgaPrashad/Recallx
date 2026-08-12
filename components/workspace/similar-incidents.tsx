"use client";

import { useState } from "react";
import Link from "next/link";
import type { RecallXBrief } from "@/lib/brief/types";
import { SeverityBadge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/design";

function SimilarIncidentCard({ item }: { item: RecallXBrief["similarIncidentDetails"][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="font-mono text-xs font-semibold text-[var(--color-accent-strong)]">{item.incidentKey}</span>
        <SeverityBadge severity={item.severity as "sev1" | "sev2" | "sev3"} />
        <span className="flex-1 truncate text-sm text-[var(--color-text-primary)]">{item.title}</span>
        {item.crossService && (
          <span className="rounded bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
            cross-service
          </span>
        )}
        <span className="text-sm font-bold tabular-nums" style={{ color: item.relevance >= 75 ? "var(--color-good)" : item.relevance >= 45 ? "var(--color-seq-400)" : "var(--color-warning)" }}>
          {item.relevance}%
        </span>
        <span className="text-[var(--color-text-muted)]">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-3 border-t px-4 py-3 text-xs md:grid-cols-2" style={{ borderColor: "var(--color-border)" }}>
          <div>
            <div className="text-[var(--color-text-muted)]">Date</div>
            <div className="text-[var(--color-text-secondary)]">{formatDateTime(item.date)}</div>
          </div>
          <div>
            <div className="text-[var(--color-text-muted)]">Service</div>
            <div className="text-[var(--color-text-secondary)]">{item.service}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-[var(--color-text-muted)]">Symptoms</div>
            <div className="text-[var(--color-text-secondary)]">{item.symptoms}</div>
          </div>
          {item.rootCause && (
            <div className="md:col-span-2">
              <div className="text-[var(--color-text-muted)]">Root cause</div>
              <div className="text-[var(--color-text-secondary)]">{item.rootCause}</div>
            </div>
          )}
          {item.fixSummary && (
            <div className="md:col-span-2">
              <div className="text-[var(--color-text-muted)]">Resolution</div>
              <div className="text-[var(--color-text-secondary)]">{item.fixSummary}</div>
            </div>
          )}
          <div>
            <div className="text-[var(--color-text-muted)]">Time to resolution</div>
            <div className="text-[var(--color-text-secondary)]">{item.timeToResolutionMin != null ? `${item.timeToResolutionMin}m` : "—"}</div>
          </div>
          <div>
            <div className="text-[var(--color-text-muted)]">Failed attempts</div>
            <div className="text-[var(--color-text-secondary)]">{item.deadEndCount}</div>
          </div>
          <div className="md:col-span-2">
            <Link href={`/incidents/${item.incidentKey}`} className="text-[var(--color-accent-strong)] hover:underline">
              Open full incident history →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function SimilarIncidents({ items }: { items: RecallXBrief["similarIncidentDetails"] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        Similar Incident Memory ({items.length})
      </h3>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <SimilarIncidentCard key={item.incidentKey} item={item} />
        ))}
      </div>
    </section>
  );
}
