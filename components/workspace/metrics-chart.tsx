"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MetricSnapshot } from "@/lib/types";

function MiniChart({
  title,
  data,
  dataKey,
  color,
  formatValue,
}: {
  title: string;
  data: MetricSnapshot[];
  dataKey: keyof MetricSnapshot;
  color: string;
  formatValue: (v: number) => string;
}) {
  const points = data.map((d) => ({
    t: new Date(d.timestamp).getTime(),
    v: d[dataKey] as number | null,
  }));

  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">{title}</span>
        <span className="text-sm font-bold tabular-nums" style={{ color }}>
          {points.length ? formatValue(points[points.length - 1]!.v ?? 0) : "—"}
        </span>
      </div>
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface-3)",
                border: "1px solid var(--color-border-strong)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(t) => new Date(t as number).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              formatter={(v) => [formatValue(Number(v)), title]}
            />
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MetricsChart({ metrics }: { metrics: MetricSnapshot[] }) {
  if (metrics.length === 0) return null;
  const hasDbConn = metrics.some((m) => m.dbConnections != null);

  return (
    <div className={`grid gap-3 ${hasDbConn ? "grid-cols-3" : "grid-cols-2"}`}>
      <MiniChart title="Error rate" data={metrics} dataKey="errorRate" color="var(--color-critical)" formatValue={(v) => `${v.toFixed(1)}%`} />
      <MiniChart
        title="p95 latency"
        data={metrics}
        dataKey="p95LatencyMs"
        color="var(--color-seq-400)"
        formatValue={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`)}
      />
      {hasDbConn && (
        <MiniChart title="DB connections" data={metrics} dataKey="dbConnections" color="var(--color-accent-strong)" formatValue={(v) => `${Math.round(v)}`} />
      )}
    </div>
  );
}
