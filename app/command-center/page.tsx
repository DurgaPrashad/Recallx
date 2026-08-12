import { listIncidentsWithMemoryMatch } from "@/lib/incidents";
import { IncidentGrid } from "@/components/command-center/incident-grid";
import { StatTile } from "@/components/ui/stat-tile";

export const dynamic = "force-dynamic";

export default async function CommandCenterPage() {
  const items = await listIncidentsWithMemoryMatch();
  const serviceSlugs = [...new Set(items.map((i) => i.service.slug))];

  const activeCount = items.filter((i) => i.incident.status === "active").length;
  const monitoringCount = items.filter((i) => i.incident.status === "monitoring").length;
  const sev1Count = items.filter((i) => i.incident.status !== "resolved" && i.incident.severity === "sev1").length;
  const matched = items.filter((i) => i.memoryMatch != null);
  const avgMatch = matched.length ? Math.round(matched.reduce((s, i) => s + (i.memoryMatch ?? 0), 0) / matched.length) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Incident Command Center</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Every AI remembers answers. Recall-X remembers what didn&apos;t work.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Active incidents" value={activeCount} accent="var(--color-critical)" />
        <StatTile label="Monitoring" value={monitoringCount} accent="var(--color-warning)" />
        <StatTile label="SEV-1 open" value={sev1Count} accent="var(--color-critical)" />
        <StatTile label="Avg. memory match" value={avgMatch != null ? `${avgMatch}%` : "—"} accent="var(--color-accent-strong)" />
      </div>

      <IncidentGrid items={items} serviceSlugs={serviceSlugs} />
    </div>
  );
}
