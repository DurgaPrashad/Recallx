import Link from "next/link";
import { computeMemoryStats, computeRecurringPatterns, computeServiceMemorySummaries } from "@/lib/memory/stats";
import { getBankStats, HindsightUnavailableError } from "@/lib/hindsight/client";
import { StatTile } from "@/components/ui/stat-tile";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { serviceColor } from "@/lib/design";

export const dynamic = "force-dynamic";

export default async function MemoryExplorerPage() {
  const [stats, patterns, serviceSummaries] = await Promise.all([
    computeMemoryStats(),
    computeRecurringPatterns(),
    computeServiceMemorySummaries(),
  ]);

  let bankStats: Awaited<ReturnType<typeof getBankStats>> | null = null;
  let hindsightConnected = true;
  try {
    bankStats = await getBankStats();
  } catch (err) {
    if (!(err instanceof HindsightUnavailableError)) throw err;
    hindsightConnected = false;
  }

  const serviceSlugs = serviceSummaries.map((s) => s.slug);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Memory Explorer</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">What Recall-X has learned from your organization&apos;s incidents.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Incidents remembered" value={stats.incidentsRemembered} />
        <StatTile label="Troubleshooting attempts" value={stats.troubleshootingAttempts} />
        <StatTile label="Dead ends learned" value={stats.deadEndsLearned} accent="var(--color-critical)" />
        <StatTile label="Verified fixes" value={stats.verifiedFixes} accent="var(--color-good)" />
        <StatTile label="Recurring patterns" value={stats.recurringPatterns} accent="var(--color-warning)" />
        <StatTile label="Services with memory" value={`${stats.servicesWithMemory}/${stats.totalServices}`} accent="var(--color-accent-strong)" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Memory Graph (Hindsight)</CardTitle>
        </CardHeader>
        <CardBody>
          {!hindsightConnected && (
            <div className="mb-3 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--color-warning)", color: "var(--color-warning)", background: "var(--color-warning-soft)" }}>
              ⚠ Hindsight is unreachable right now — showing Recall-X&apos;s local ledger stats above; live memory-graph metrics are unavailable.
              {stats.pendingHindsightSync > 0 && ` ${stats.pendingHindsightSync} lesson(s) are queued and will sync once it's back online.`}
            </div>
          )}
          {bankStats ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="Memory nodes" value={bankStats.total_nodes} />
              <StatTile label="Memory links" value={bankStats.total_links} />
              <StatTile label="Documents ingested" value={bankStats.total_documents} />
              <StatTile label="Observations" value={bankStats.total_observations ?? 0} />
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">No live memory-graph data available.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recurring Root Causes</CardTitle>
        </CardHeader>
        <CardBody>
          {patterns.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No recurring patterns detected yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {patterns.map((p) => (
                <div key={p.patternTag} className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{p.patternTag.replace(/-/g, " ")}</span>
                  <span className="rounded-md bg-[var(--color-surface-3)] px-2 py-0.5 text-xs font-bold text-[var(--color-warning)]">
                    {p.incidentCount} incidents
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">{p.services.join(", ")}</span>
                  <div className="ml-auto flex flex-wrap gap-1.5">
                    {p.incidentKeys.map((k) => (
                      <Link key={k} href={`/incidents/${k}`} className="rounded bg-[var(--color-surface-3)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-accent-strong)] hover:underline">
                        {k}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services With Memory</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {serviceSummaries.map((s) => (
              <div key={s.slug} className="rounded-lg border px-4 py-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: serviceColor(s.slug, serviceSlugs) }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: serviceColor(s.slug, serviceSlugs) }} />
                  {s.name}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="text-base font-bold text-[var(--color-text-primary)]">{s.incidentCount}</div>
                    <div className="text-[var(--color-text-muted)]">incidents</div>
                  </div>
                  <div>
                    <div className="text-base font-bold" style={{ color: "var(--color-critical)" }}>
                      {s.deadEndCount}
                    </div>
                    <div className="text-[var(--color-text-muted)]">dead ends</div>
                  </div>
                  <div>
                    <div className="text-base font-bold" style={{ color: "var(--color-good)" }}>
                      {s.fixCount}
                    </div>
                    <div className="text-[var(--color-text-muted)]">fixes</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
