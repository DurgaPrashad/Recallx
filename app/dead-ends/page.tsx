import Link from "next/link";
import { computeDeadEndLibrary } from "@/lib/memory/stats";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function DeadEndLibraryPage() {
  const entries = await computeDeadEndLibrary();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Dead-End Library</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          Every troubleshooting action Recall-X has seen attempted across incidents — including the ones that didn&apos;t work.
          This is accumulated operational experience, not isolated events.
        </p>
      </div>

      {entries.length === 0 ? (
        <EmptyState title="No dead ends learned yet" description="Once incidents are investigated and outcomes are recorded, patterns will appear here." />
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((e) => {
            const total = e.attemptedCount || 1;
            return (
              <Card key={e.action}>
                <CardBody className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{e.action}</h3>
                    <span className="text-sm font-bold tabular-nums text-[var(--color-text-secondary)]">
                      Attempted {e.attemptedCount} time{e.attemptedCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                    {e.solvedCount > 0 && <div style={{ width: `${(e.solvedCount / total) * 100}%`, background: "var(--color-good)" }} />}
                    {e.partialCount > 0 && <div style={{ width: `${(e.partialCount / total) * 100}%`, background: "var(--color-warning)" }} />}
                    {e.failedCount > 0 && <div style={{ width: `${(e.failedCount / total) * 100}%`, background: "var(--color-critical)" }} />}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="text-sm font-bold" style={{ color: "var(--color-good)" }}>
                        {e.solvedCount}
                      </div>
                      <div className="text-[var(--color-text-muted)]">solved underlying issue</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: "var(--color-warning)" }}>
                        {e.partialCount}
                      </div>
                      <div className="text-[var(--color-text-muted)]">temporary improvement</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: "var(--color-critical)" }}>
                        {e.failedCount}
                      </div>
                      <div className="text-[var(--color-text-muted)]">no impact</div>
                    </div>
                  </div>

                  {e.associatedPatterns.length > 0 && (
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Frequently associated with:{" "}
                      <span className="text-[var(--color-text-secondary)]">{e.associatedPatterns.map((p) => p.replace(/-/g, " ")).join(", ")}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {e.incidentKeys.map((k) => (
                      <Link key={k} href={`/incidents/${k}`} className="rounded bg-[var(--color-surface-3)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-accent-strong)] hover:underline">
                        {k}
                      </Link>
                    ))}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
