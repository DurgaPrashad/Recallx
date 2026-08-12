"use client";

import { useState } from "react";
import Link from "next/link";
import type { RecallXBrief } from "@/lib/brief/types";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import { Pill } from "@/components/ui/badge";
import { SimilarIncidents } from "@/components/workspace/similar-incidents";

function EvidenceChips({ keys }: { keys: string[] }) {
  if (!keys.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {keys.map((k) => (
        <Link
          key={k}
          href={`/incidents/${k}`}
          className="rounded px-1.5 py-0.5 text-[11px] font-mono font-medium text-[var(--color-accent-strong)] hover:underline"
          style={{ background: "var(--color-accent-soft)" }}
        >
          {k}
        </Link>
      ))}
    </div>
  );
}

function DeadEndCard({ item }: { item: RecallXBrief["dontTryAgain"][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ borderColor: "rgba(224,90,90,0.35)", background: "rgba(224,90,90,0.06)" }}
    >
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ background: "var(--color-critical-soft)", color: "var(--color-critical)" }}
        >
          ✕
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-[var(--color-text-primary)]">{item.action}</span>
          <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
            Failed in {item.attemptedInIncidentKeys.length} similar incident{item.attemptedInIncidentKeys.length === 1 ? "" : "s"}
          </span>
        </span>
        <span className="mt-0.5 text-[var(--color-text-muted)]">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t px-4 py-3 text-sm" style={{ borderColor: "rgba(224,90,90,0.25)" }}>
          <p className="text-[var(--color-text-secondary)]">{item.failureSummary}</p>
          <EvidenceChips keys={item.attemptedInIncidentKeys} />
        </div>
      )}
    </div>
  );
}

function WorkedCard({ item }: { item: RecallXBrief["whatWorkedBefore"][number] }) {
  return (
    <div className="rounded-lg border px-4 py-3" style={{ borderColor: "rgba(12,163,12,0.3)", background: "rgba(12,163,12,0.06)" }}>
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ background: "var(--color-good-soft)", color: "var(--color-good)" }}
        >
          ✓
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">{item.action}</div>
          <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{item.successSummary}</div>
          <EvidenceChips keys={item.incidentKeys} />
        </div>
      </div>
    </div>
  );
}

export function BriefPanel({ brief }: { brief: RecallXBrief }) {
  const headline =
    brief.confidenceLabel === "strong"
      ? "High-confidence historical match detected"
      : brief.confidenceLabel === "possible"
        ? "Possible historical match found"
        : brief.confidenceLabel === "weak"
          ? "Only weak historical similarity found"
          : "No strong historical match — treat as a fresh investigation";

  return (
    <div className="flex flex-col gap-5">
      {brief.evidenceSource === "sqlite" && (
        <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--color-warning)", color: "var(--color-warning)", background: "var(--color-warning-soft)" }}>
          ⚠ Hindsight memory service is unreachable — this analysis was reconstructed from Recall-X&apos;s local incident ledger.
        </div>
      )}

      <div>
        <div className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">{headline}</div>
        <ConfidenceMeter value={brief.overallConfidence} size="lg" />
      </div>

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Probable Root Cause</h3>
        {brief.probableCause ? (
          <div className="rounded-lg border px-4 py-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{brief.probableCause.cause}</p>
              <span className="shrink-0 text-sm font-bold tabular-nums" style={{ color: "var(--color-accent-strong)" }}>
                {brief.probableCause.confidence}%
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">{brief.probableCause.explanation}</p>
            <EvidenceChips keys={brief.probableCause.evidenceIncidentKeys} />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-[var(--color-text-muted)]" style={{ borderColor: "var(--color-border)" }}>
            Historical evidence is insufficient to name a probable cause yet. Investigate before reaching for a remediation.
          </div>
        )}
      </section>

      {brief.checkFirst.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Check First</h3>
          <ol className="flex flex-col gap-2">
            {brief.checkFirst.map((c, i) => (
              <li key={i} className="rounded-lg border px-4 py-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
                <div className="flex gap-3">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-strong)" }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{c.step}</div>
                    <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">{c.why}</div>
                    <EvidenceChips keys={c.evidenceIncidentKeys} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {brief.dontTryAgain.length > 0 && (
        <section
          className="rounded-xl border-2 p-4"
          style={{
            borderColor: "rgba(224,90,90,0.4)",
            background:
              "repeating-linear-gradient(135deg, rgba(224,90,90,0.05) 0px, rgba(224,90,90,0.05) 10px, transparent 10px, transparent 20px)",
          }}
        >
          <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide" style={{ color: "var(--color-critical)" }}>
            <span>⚠</span> Don&apos;t Try Again
          </h3>
          <div className="flex flex-col gap-2">
            {brief.dontTryAgain.map((item, i) => (
              <DeadEndCard key={i} item={item} />
            ))}
          </div>
          <p className="mt-3 text-xs italic text-[var(--color-text-muted)]">
            Your team already paid the cost of learning this lesson once.
          </p>
        </section>
      )}

      {brief.whatWorkedBefore.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">What Worked Before</h3>
          <div className="flex flex-col gap-2">
            {brief.whatWorkedBefore.map((item, i) => (
              <WorkedCard key={i} item={item} />
            ))}
          </div>
        </section>
      )}

      {(brief.matchExplanation.matched.length > 0 || brief.matchExplanation.mismatched.length > 0) && (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Match based on</h3>
          <div className="flex flex-wrap gap-1.5">
            {brief.matchExplanation.matched.map((m, i) => (
              <Pill key={`m${i}`} tone="accent">
                ✓ {m}
              </Pill>
            ))}
            {brief.matchExplanation.mismatched.map((m, i) => (
              <Pill key={`x${i}`} tone="muted">
                ✕ {m}
              </Pill>
            ))}
          </div>
        </section>
      )}

      <SimilarIncidents items={brief.similarIncidentDetails} />

      {brief.uncertaintyNote && (
        <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--color-warning)", color: "var(--color-warning)", background: "var(--color-warning-soft)" }}>
          {brief.uncertaintyNote}
        </div>
      )}
    </div>
  );
}
