"use client";

import { motion } from "framer-motion";

interface MemoryNode {
  id: string;
  x: number;
  y: number;
  color: string;
  match: boolean;
  label: string;
  sub: string;
}

const NEW_INCIDENT = { x: 110, y: 190 };

const MEMORY_NODES: MemoryNode[] = [
  { id: "inc-1042", x: 640, y: 66, color: "var(--color-good)", match: true, label: "INC-1042", sub: "Connection leak · confirmed" },
  { id: "inc-0763", x: 660, y: 190, color: "var(--color-accent-strong)", match: true, label: "INC-0763", sub: "Connection leak · confirmed" },
  { id: "inc-0891", x: 640, y: 314, color: "var(--color-warning)", match: false, label: "INC-0891", sub: "Slow query · red herring" },
];

export function MemoryRecallDiagram() {
  return (
    <div className="relative w-full">
      <svg viewBox="0 0 760 380" className="h-auto w-full" role="img" aria-label="Diagram of Recall-X matching a new incident against remembered history">
        <defs>
          <filter id="nodeGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {MEMORY_NODES.map((n, i) => (
          <motion.line
            key={`line-${n.id}`}
            x1={NEW_INCIDENT.x}
            y1={NEW_INCIDENT.y}
            x2={n.x}
            y2={n.y}
            stroke={n.match ? n.color : "var(--color-text-muted)"}
            strokeWidth={n.match ? 1.6 : 1.1}
            strokeDasharray={n.match ? undefined : "4 5"}
            opacity={n.match ? 0.7 : 0.4}
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 1, delay: 0.25 + i * 0.18, ease: "easeInOut" }}
          />
        ))}

        {/* New incident node */}
        <motion.circle
          cx={NEW_INCIDENT.x}
          cy={NEW_INCIDENT.y}
          r={13}
          fill="var(--color-critical)"
          filter="url(#nodeGlow)"
          className="animate-node-pulse"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5 }}
        />

        {MEMORY_NODES.map((n, i) => (
          <motion.circle
            key={`node-${n.id}`}
            cx={n.x}
            cy={n.y}
            r={n.match ? 9 : 7}
            fill={n.color}
            opacity={n.match ? 1 : 0.75}
            filter={n.match ? "url(#nodeGlow)" : undefined}
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: n.match ? 1 : 0.75 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.4, delay: 0.25 + i * 0.18 }}
          />
        ))}
      </svg>

      {/* Overlaid labels, positioned by percentage of the 760x380 viewBox */}
      <div
        className="glass absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-lg px-3 py-1.5 text-center"
        style={{ left: `${(NEW_INCIDENT.x / 760) * 100}%`, top: `${(NEW_INCIDENT.y / 380) * 100 - 12}%` }}
      >
        <span className="text-[11px] font-bold text-[var(--color-text-primary)]">INC-1148 · New</span>
        <span className="text-[10px] text-[var(--color-text-muted)]">checkout-api degradation</span>
      </div>

      {MEMORY_NODES.map((n) => (
        <div
          key={`label-${n.id}`}
          className="glass absolute flex -translate-y-1/2 flex-col rounded-lg px-3 py-1.5"
          style={{ left: `${(n.x / 760) * 100 + 3}%`, top: `${(n.y / 380) * 100}%` }}
        >
          <span className="font-mono text-[11px] font-semibold" style={{ color: n.match ? n.color : "var(--color-warning)" }}>
            {n.label}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">{n.sub}</span>
        </div>
      ))}
    </div>
  );
}
