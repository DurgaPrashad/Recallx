"use client";

import { useCallback, useEffect, useState } from "react";
import { SeverityBadge, StatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { MetricsChart } from "@/components/workspace/metrics-chart";
import { BriefPanel } from "@/components/workspace/brief-panel";
import { TimelinePanel } from "@/components/workspace/timeline-panel";
import { ResolveFlow } from "@/components/workspace/resolve-flow";
import { AskPanel } from "@/components/ask/ask-panel";
import { formatDuration, formatDateTime } from "@/lib/design";
import type { IncidentFull } from "@/lib/types";
import type { RecallXBrief } from "@/lib/brief/types";

export function InvestigationWorkspace({ initial }: { initial: IncidentFull }) {
  const [full, setFull] = useState<IncidentFull>(initial);
  const [brief, setBrief] = useState<RecallXBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [briefError, setBriefError] = useState<string | null>(null);

  const refetchFull = useCallback(async () => {
    const res = await fetch(`/api/incidents/${initial.incident.key}`);
    if (res.ok) setFull(await res.json());
  }, [initial.incident.key]);

  const loadBrief = useCallback(async () => {
    setBriefLoading(true);
    setBriefError(null);
    try {
      const res = await fetch(`/api/incidents/${initial.incident.key}/brief`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to generate Recall-X Brief");
      }
      setBrief(await res.json());
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : "Failed to generate Recall-X Brief");
    } finally {
      setBriefLoading(false);
    }
  }, [initial.incident.key]);

  useEffect(() => {
    loadBrief();
  }, [loadBrief]);

  async function handleMutated() {
    await Promise.all([refetchFull(), loadBrief()]);
  }

  const { incident, service, engineer, timeline, attempts, metrics } = full;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
          <span className="font-mono text-xs text-[var(--color-text-muted)]">{incident.key}</span>
          <span className="text-xs text-[var(--color-text-muted)]">· {service.name}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">{incident.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--color-text-secondary)]">{incident.summary}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--color-text-muted)]">
          <span>
            Started {formatDateTime(incident.startedAt)} · {formatDuration(incident.startedAt, incident.resolvedAt)} elapsed
          </span>
          <span>Assigned: {engineer ? engineer.name : "Unassigned"}</span>
          {incident.deployContext && <span>Deploy: {incident.deployContext}</span>}
        </div>
      </div>

      <MetricsChart metrics={metrics} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle>Recall-X Brief</CardTitle>
            </CardHeader>
            <CardBody>
              {briefLoading && (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              )}
              {briefError && !briefLoading && (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-sm text-[var(--color-critical)]">{briefError}</p>
                  <Button size="sm" variant="secondary" onClick={loadBrief}>
                    Retry
                  </Button>
                </div>
              )}
              {brief && !briefLoading && !briefError && <BriefPanel brief={brief} />}
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <ResolveFlow incident={incident} onResolved={handleMutated} />

          <Card>
            <CardHeader>
              <CardTitle>Investigation Timeline</CardTitle>
            </CardHeader>
            <CardBody>
              <TimelinePanel incident={incident} timeline={timeline} attempts={attempts} onMutated={handleMutated} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ask Recall-X</CardTitle>
            </CardHeader>
            <CardBody>
              <AskPanel serviceSlug={service.slug} incidentKey={incident.key} compact />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
