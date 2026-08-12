"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import { ResolveFlow } from "@/components/workspace/resolve-flow";
import { AskPanel } from "@/components/ask/ask-panel";
import type { RecallXBrief } from "@/lib/brief/types";
import type { Incident } from "@/lib/types";

interface StagePreview {
  loading: boolean;
  brief: RecallXBrief | null;
  error: string | null;
}

const EMPTY_PREVIEW: StagePreview = { loading: false, brief: null, error: null };

function BriefSummary({ brief }: { brief: RecallXBrief }) {
  return (
    <div className="flex flex-col gap-3">
      <ConfidenceMeter value={brief.overallConfidence} />
      <div className="text-sm text-[var(--color-text-primary)]">
        {brief.probableCause ? (
          <>
            <span className="font-semibold">Probable cause: </span>
            {brief.probableCause.cause}
          </>
        ) : (
          <span className="text-[var(--color-text-muted)]">No probable cause identified — insufficient evidence.</span>
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
        <span>{brief.similarIncidents.length} similar incident{brief.similarIncidents.length === 1 ? "" : "s"} found</span>
        <span style={{ color: "var(--color-critical)" }}>{brief.dontTryAgain.length} dead end{brief.dontTryAgain.length === 1 ? "" : "s"} flagged</span>
        <span style={{ color: "var(--color-good)" }}>{brief.whatWorkedBefore.length} known fix{brief.whatWorkedBefore.length === 1 ? "" : "es"}</span>
      </div>
    </div>
  );
}

export default function DemoModePage() {
  const [heroIncident, setHeroIncident] = useState<Incident | null>(null);
  const [loadingHero, setLoadingHero] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  const [stage1, setStage1] = useState<StagePreview>(EMPTY_PREVIEW);
  const [stage2, setStage2] = useState<StagePreview>(EMPTY_PREVIEW);
  const [stage3, setStage3] = useState<StagePreview>(EMPTY_PREVIEW);
  const [resolved, setResolved] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  function pushLog(line: string) {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}  ${line}`]);
  }

  useEffect(() => {
    fetch("/api/incidents")
      .then((r) => r.json())
      .then((data: { incidents: Array<{ incident: Incident }> }) => {
        const hero = data.incidents.find((i) => i.incident.isHero)?.incident ?? null;
        setHeroIncident(hero);
      })
      .finally(() => setLoadingHero(false));
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  async function runStage(
    stage: 1 | 2 | 3,
    setter: (p: StagePreview) => void,
    demoOrderMax: number | undefined,
    label: string
  ) {
    if (!heroIncident) return;
    setter({ loading: true, brief: null, error: null });
    pushLog(`Stage ${stage}: calling Hindsight recall() for ${heroIncident.key}${demoOrderMax ? ` (memory capped at first ${demoOrderMax} historical incidents)` : " (full memory)"}…`);
    try {
      const url = `/api/incidents/${heroIncident.key}/brief${demoOrderMax ? `?demoOrderMax=${demoOrderMax}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to generate brief");
      }
      const brief: RecallXBrief = await res.json();
      pushLog(
        `Stage ${stage} (${label}): ${brief.similarIncidents.length} similar incident(s) found, confidence ${brief.overallConfidence}% (${brief.confidenceLabel}).`
      );
      setter({ loading: false, brief, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      pushLog(`Stage ${stage} failed: ${msg}`);
      setter({ loading: false, brief: null, error: msg });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Demo Mode</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          A guided walkthrough proving Recall-X gets more useful as organizational memory accumulates — every step below
          makes a real call against real seeded data, nothing here is scripted.
        </p>
      </div>

      {loadingHero && (
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Spinner /> Loading hero incident…
        </div>
      )}

      {!loadingHero && !heroIncident && (
        <Card>
          <CardBody className="text-sm text-[var(--color-text-muted)]">
            No hero incident found. Run <code className="rounded bg-[var(--color-surface-3)] px-1">npm run seed</code> to seed demo data.
          </CardBody>
        </Card>
      )}

      {heroIncident && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Hero scenario: {heroIncident.key} — {heroIncident.title}</CardTitle>
            </CardHeader>
            <CardBody className="text-sm text-[var(--color-text-secondary)]">{heroIncident.summary}</CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Stage 1 — Limited Memory</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col gap-3">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Only the earliest 2 historical incidents are considered — simulating a young organization with little memory yet.
                </p>
                <Button size="sm" onClick={() => runStage(1, setStage1, 2, "limited memory")} disabled={stage1.loading}>
                  {stage1.loading ? "Running…" : "Run Stage 1"}
                </Button>
                {stage1.error && <p className="text-xs text-[var(--color-critical)]">{stage1.error}</p>}
                {stage1.brief && <BriefSummary brief={stage1.brief} />}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stage 2 — Learning</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col gap-3">
                <p className="text-xs text-[var(--color-text-muted)]">
                  All 22 historical incidents and their outcomes are now available — patterns start emerging.
                </p>
                <Button size="sm" onClick={() => runStage(2, setStage2, 22, "full history")} disabled={stage2.loading}>
                  {stage2.loading ? "Running…" : "Run Stage 2"}
                </Button>
                {stage2.error && <p className="text-xs text-[var(--color-critical)]">{stage2.error}</p>}
                {stage2.brief && <BriefSummary brief={stage2.brief} />}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stage 3 — Recall</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col gap-3">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Trigger the full analysis on the hero incident — probable cause, check-first, dead ends, what worked.
                </p>
                <Button size="sm" onClick={() => runStage(3, setStage3, undefined, "full recall")} disabled={stage3.loading}>
                  {stage3.loading ? "Running…" : "Run Stage 3"}
                </Button>
                {stage3.error && <p className="text-xs text-[var(--color-critical)]">{stage3.error}</p>}
                {stage3.brief && <BriefSummary brief={stage3.brief} />}
                {stage3.brief && (
                  <Link href={`/incidents/${heroIncident.key}`}>
                    <Button size="sm" variant="primary" className="w-full">
                      Open full Investigation Workspace →
                    </Button>
                  </Link>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Stage 4 — New Learning</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Resolve the hero incident right here, then ask Recall-X about it — proving the lesson is recallable immediately
                after being taught.
              </p>
              {!resolved && heroIncident.status !== "resolved" ? (
                <ResolveFlow incident={heroIncident} onResolved={() => setResolved(true)} />
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium" style={{ color: "var(--color-good)" }}>
                    ✓ {resolved ? "Resolved just now." : "Already resolved in this dataset."} Now ask Recall-X about it — this
                    queries the memory that was written when it was resolved.
                  </p>
                  {!resolved && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Run <code className="rounded bg-[var(--color-surface-3)] px-1">npm run seed</code> to reset the hero
                      incident to unresolved and replay this stage from scratch.
                    </p>
                  )}
                  <AskPanel
                    serviceSlug="checkout-api"
                    suggestions={[`What fixed the ${heroIncident.key} incident?`, "What was the root cause of the latest checkout-api outage?"]}
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="max-h-56 overflow-y-auto rounded-lg bg-[var(--color-surface-2)] p-3 font-mono text-xs text-[var(--color-text-secondary)]">
            {log.length === 0 ? (
              <span className="text-[var(--color-text-muted)]">Run a stage above to see live activity…</span>
            ) : (
              log.map((line, i) => <div key={i}>{line}</div>)
            )}
            <div ref={logEndRef} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
