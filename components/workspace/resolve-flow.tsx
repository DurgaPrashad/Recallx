"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import type { Incident } from "@/lib/types";

interface MemoryUpdateSummary {
  confirmedRootCause: number;
  investigationSignals: number;
  deadEnds: number;
  verifiedFixes: number;
}

export function ResolveFlow({ incident, onResolved }: { incident: Incident; onResolved: () => void }) {
  const [open, setOpen] = useState(false);
  const [rootCause, setRootCause] = useState("");
  const [fixSummary, setFixSummary] = useState("");
  const [lessonsLearned, setLessonsLearned] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MemoryUpdateSummary | null>(null);
  const [hindsightAvailable, setHindsightAvailable] = useState(true);

  if (incident.status === "resolved") return null;

  if (summary) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-bold" style={{ color: "var(--color-good)" }}>
            <span>✓</span> Memory Updated
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">Recall-X learned:</p>
          <ul className="flex flex-col gap-1 text-sm text-[var(--color-text-primary)]">
            <li>{summary.confirmedRootCause} confirmed root cause</li>
            <li>{summary.investigationSignals} investigation signal{summary.investigationSignals === 1 ? "" : "s"}</li>
            <li>{summary.deadEnds} dead end{summary.deadEnds === 1 ? "" : "s"}</li>
            <li>{summary.verifiedFixes} verified remediation</li>
          </ul>
          {!hindsightAvailable && (
            <p className="text-xs" style={{ color: "var(--color-warning)" }}>
              ⚠ Memory service was unreachable — these lessons are saved locally and will sync to Hindsight once it&apos;s back online.
            </p>
          )}
          <p className="text-xs italic text-[var(--color-text-muted)]">These lessons can now help during future incidents.</p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setOpen(false);
              onResolved();
            }}
          >
            Done
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        Resolve Incident
      </Button>
    );
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div className="text-sm font-semibold text-[var(--color-text-primary)]">Resolve {incident.key}</div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Confirmed root cause</label>
          <textarea
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value)}
            rows={2}
            className="w-full rounded-md border bg-[var(--color-surface-2)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]"
            style={{ borderColor: "var(--color-border-strong)" }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Final fix</label>
          <textarea
            value={fixSummary}
            onChange={(e) => setFixSummary(e.target.value)}
            rows={2}
            className="w-full rounded-md border bg-[var(--color-surface-2)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]"
            style={{ borderColor: "var(--color-border-strong)" }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Lessons learned (optional)</label>
          <textarea
            value={lessonsLearned}
            onChange={(e) => setLessonsLearned(e.target.value)}
            rows={2}
            className="w-full rounded-md border bg-[var(--color-surface-2)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]"
            style={{ borderColor: "var(--color-border-strong)" }}
          />
        </div>
        {error && <div className="text-xs text-[var(--color-critical)]">{error}</div>}
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={submitting || !rootCause.trim() || !fixSummary.trim()}
            onClick={async () => {
              setSubmitting(true);
              setError(null);
              try {
                const res = await fetch(`/api/incidents/${incident.id}/resolve`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ rootCause, fixSummary, lessonsLearned: lessonsLearned || undefined }),
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data.error ?? "Failed to resolve incident");
                }
                const data = await res.json();
                setHindsightAvailable(Boolean(data.hindsightAvailable));
                setSummary(data.memoryUpdateSummary);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to resolve incident");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Resolving…" : "Confirm resolution"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
