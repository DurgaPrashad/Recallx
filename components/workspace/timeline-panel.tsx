"use client";

import { useState } from "react";
import type { Attempt, AttemptOutcome, Incident, TimelineEvent } from "@/lib/types";
import { OutcomeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/design";

const TYPE_ICON: Record<TimelineEvent["type"], string> = {
  alert: "🚨",
  action: "▶",
  observation: "👁",
  note: "📝",
  hypothesis: "💭",
  resolution: "✅",
};

function TeachOutcome({ attempt, onDone }: { attempt: Attempt; onDone: () => void }) {
  const [outcome, setOutcome] = useState<AttemptOutcome | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [learned, setLearned] = useState<null | { memoryLearned: boolean }>(null);

  const options: { value: AttemptOutcome; label: string; icon: string }[] = [
    { value: "solved", label: "Solved it", icon: "✓" },
    { value: "partial", label: "Partially helped", icon: "△" },
    { value: "failed", label: "Didn't help", icon: "✕" },
    { value: "inconclusive", label: "Inconclusive", icon: "?" },
  ];

  if (learned) {
    return (
      <div className="mt-2 rounded-md px-3 py-2 text-xs font-medium" style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-strong)" }}>
        {learned.memoryLearned ? "✓ Recall-X learned from this incident." : "Saved locally — Recall-X memory service is offline, will sync later."}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border px-3 py-2" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
      <div className="mb-1.5 text-xs font-medium text-[var(--color-text-muted)]">Did this help?</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => setOutcome(o.value)}
            className="rounded-md border px-2 py-1 text-xs font-medium transition-colors"
            style={{
              borderColor: outcome === o.value ? "var(--color-accent)" : "var(--color-border-strong)",
              background: outcome === o.value ? "var(--color-accent-soft)" : "transparent",
              color: outcome === o.value ? "var(--color-accent-strong)" : "var(--color-text-secondary)",
            }}
          >
            {o.icon} {o.label}
          </button>
        ))}
      </div>
      {outcome && (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened, specifically? (e.g. metrics recovered for 3 minutes then failed again)"
            rows={2}
            className="w-full rounded-md border bg-[var(--color-surface-1)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
            style={{ borderColor: "var(--color-border-strong)" }}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="primary"
              disabled={!notes.trim() || submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  const res = await fetch(`/api/incidents/${attempt.incidentId}/attempts/${attempt.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ outcome, outcomeNotes: notes }),
                  });
                  const data = await res.json();
                  setLearned({ memoryLearned: Boolean(data.memoryLearned) });
                  setTimeout(onDone, 900);
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Saving…" : "Save outcome"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TimelinePanel({
  incident,
  timeline,
  attempts,
  onMutated,
}: {
  incident: Incident;
  timeline: TimelineEvent[];
  attempts: Attempt[];
  onMutated: () => void;
}) {
  const [addingAction, setAddingAction] = useState(false);
  const [addingNote, setAddingNote] = useState<"note" | "hypothesis" | null>(null);
  const [actionText, setActionText] = useState("");
  const [hypothesisText, setHypothesisText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);

  const attemptById = new Map(attempts.map((a) => [a.id, a]));
  const editable = incident.status !== "resolved";
  const sorted = [...timeline].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  async function submitAction() {
    if (!actionText.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/incidents/${incident.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionText, hypothesis: hypothesisText || undefined }),
      });
      setActionText("");
      setHypothesisText("");
      setAddingAction(false);
      onMutated();
    } finally {
      setBusy(false);
    }
  }

  async function submitNote() {
    if (!noteText.trim() || !addingNote) return;
    setBusy(true);
    try {
      await fetch(`/api/incidents/${incident.id}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: addingNote, content: noteText }),
      });
      setNoteText("");
      setAddingNote(null);
      onMutated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {editable && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setAddingAction((v) => !v)}>
            + Log an action
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingNote(addingNote === "note" ? null : "note")}>
            + Investigation note
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingNote(addingNote === "hypothesis" ? null : "hypothesis")}>
            + Hypothesis
          </Button>
        </div>
      )}

      {addingAction && (
        <div className="rounded-md border px-3 py-2" style={{ borderColor: "var(--color-border-strong)", background: "var(--color-surface-2)" }}>
          <input
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
            placeholder="What are you about to try? e.g. Restarted checkout-api pods"
            className="w-full rounded-md border bg-[var(--color-surface-1)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
            style={{ borderColor: "var(--color-border-strong)" }}
          />
          <input
            value={hypothesisText}
            onChange={(e) => setHypothesisText(e.target.value)}
            placeholder="Hypothesis (optional): why do you think this will help?"
            className="mt-2 w-full rounded-md border bg-[var(--color-surface-1)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
            style={{ borderColor: "var(--color-border-strong)" }}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAddingAction(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" disabled={busy || !actionText.trim()} onClick={submitAction}>
              Log action
            </Button>
          </div>
        </div>
      )}

      {addingNote && (
        <div className="rounded-md border px-3 py-2" style={{ borderColor: "var(--color-border-strong)", background: "var(--color-surface-2)" }}>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={addingNote === "note" ? "Investigation note…" : "Hypothesis…"}
            rows={2}
            className="w-full rounded-md border bg-[var(--color-surface-1)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
            style={{ borderColor: "var(--color-border-strong)" }}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAddingNote(null)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" disabled={busy || !noteText.trim()} onClick={submitNote}>
              Save
            </Button>
          </div>
        </div>
      )}

      <ol className="flex flex-col gap-3 border-l pl-4" style={{ borderColor: "var(--color-border)" }}>
        {sorted.map((event) => {
          const attempt = event.attemptId ? attemptById.get(event.attemptId) : undefined;
          return (
            <li key={event.id} className="relative">
              <span
                className="absolute -left-[22px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px]"
                style={{ background: "var(--color-surface-3)" }}
              >
                {TYPE_ICON[event.type]}
              </span>
              <div className="flex flex-wrap items-baseline gap-2 text-xs text-[var(--color-text-muted)]">
                <span className="font-mono tabular-nums">{formatDateTime(event.timestamp)}</span>
                <span>· {event.author}</span>
              </div>
              <div className="mt-0.5 text-sm text-[var(--color-text-primary)]">{event.content}</div>
              {attempt && event.type === "action" && (
                <div className="mt-1">
                  {attempt.outcome !== "pending" ? (
                    <OutcomeBadge outcome={attempt.outcome} />
                  ) : editable ? (
                    <TeachOutcome attempt={attempt} onDone={onMutated} />
                  ) : (
                    <OutcomeBadge outcome="pending" />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
