"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import { MarkdownLite } from "@/components/ask/markdown-lite";

interface AskAnswer {
  question: string;
  answerMarkdown: string;
  remembered: Array<{ incidentKey: string; fact: string }>;
  inferenceNote: string | null;
  source: "live" | "fallback";
}

interface Exchange {
  question: string;
  answer?: AskAnswer;
  loading?: boolean;
  error?: string;
}

const DEFAULT_SUGGESTIONS = [
  "Have we seen this before?",
  "What failed last time?",
  "Why shouldn't I restart the pods?",
  "What fixed this last time?",
];

export function AskPanel({
  serviceSlug,
  incidentKey,
  suggestions = DEFAULT_SUGGESTIONS,
  compact = false,
}: {
  serviceSlug?: string;
  incidentKey?: string;
  suggestions?: string[];
  compact?: boolean;
}) {
  const [input, setInput] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setExchanges((prev) => [...prev, { question, loading: true }]);
    setInput("");
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, serviceSlug, incidentKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Ask Recall-X failed");
      }
      const answer: AskAnswer = await res.json();
      setExchanges((prev) => prev.map((e, i) => (i === prev.length - 1 ? { question, answer } : e)));
    } catch (err) {
      setExchanges((prev) =>
        prev.map((e, i) => (i === prev.length - 1 ? { question, error: err instanceof Error ? err.message : "Something went wrong" } : e))
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {exchanges.length === 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="rounded-full border px-3 py-1 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
              style={{ borderColor: "var(--color-border-strong)" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className={`flex flex-col gap-4 ${compact ? "max-h-[420px] overflow-y-auto pr-1" : ""}`}>
        {exchanges.map((ex, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="self-end rounded-lg rounded-br-sm bg-[var(--color-surface-3)] px-3 py-1.5 text-sm text-[var(--color-text-primary)]">
              {ex.question}
            </div>
            {ex.loading && (
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <Spinner /> Recalling relevant memory…
              </div>
            )}
            {ex.error && <div className="text-xs text-[var(--color-critical)]">{ex.error}</div>}
            {ex.answer && (
              <div className="rounded-lg rounded-bl-sm border px-3 py-2.5 text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-1)" }}>
                <div className="text-[var(--color-text-primary)]">
                  <MarkdownLite text={ex.answer.answerMarkdown} />
                </div>
                {ex.answer.remembered.length > 0 && (
                  <div className="mt-2.5 border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--color-accent-strong)" }}>
                      Remembered
                    </div>
                    <ul className="flex flex-col gap-1">
                      {ex.answer.remembered.map((r, ri) => (
                        <li key={ri} className="text-xs text-[var(--color-text-secondary)]">
                          <Link href={`/incidents/${r.incidentKey}`} className="font-mono font-medium text-[var(--color-accent-strong)] hover:underline">
                            {r.incidentKey}
                          </Link>{" "}
                          {r.fact}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {ex.answer.inferenceNote && (
                  <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-warning)]">Inference</div>
                    <p className="text-xs italic text-[var(--color-text-secondary)]">{ex.answer.inferenceNote}</p>
                  </div>
                )}
                {ex.answer.source === "fallback" && (
                  <div className="mt-2 text-[10px] text-[var(--color-warning)]">⚠ Memory service unavailable when this was answered.</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") ask(input);
          }}
          placeholder="Ask Recall-X anything about past incidents…"
          className="flex-1 rounded-md border bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
          style={{ borderColor: "var(--color-border-strong)" }}
        />
        <Button variant="primary" disabled={busy || !input.trim()} onClick={() => ask(input)}>
          Ask
        </Button>
      </div>
    </div>
  );
}
