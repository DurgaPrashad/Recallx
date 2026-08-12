"use client";

import { buildGraph, HERO_CLUSTERS } from "./graph-data";

const { nodes, edges } = buildGraph(HERO_CLUSTERS, 7);
const nodeById = new Map(nodes.map((n) => [n.id, n]));

const BADGES = [
  { label: "INC-1042", left: "16%", top: "34%" },
  { label: "INC-0891", left: "7%", top: "62%" },
  { label: "INC-0763", left: "83%", top: "22%" },
];

export function MemoryGraphHero() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Bloom glows behind the graph, matching the cluster colors */}
      <div
        className="animate-drift absolute h-[420px] w-[420px] rounded-full opacity-30 blur-[110px]"
        style={{ background: "var(--color-cat-1)", left: "-4%", top: "6%" }}
      />
      <div
        className="animate-drift absolute h-[360px] w-[360px] rounded-full opacity-25 blur-[110px]"
        style={{ background: "var(--color-critical)", left: "42%", top: "48%", animationDelay: "-7s" }}
      />
      <div
        className="animate-drift absolute h-[420px] w-[420px] rounded-full opacity-30 blur-[120px]"
        style={{ background: "var(--color-accent)", right: "-6%", top: "2%", animationDelay: "-14s" }}
      />

      <svg viewBox="0 0 900 420" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="fadeMask" cx="50%" cy="38%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="graphFade">
            <rect x="0" y="0" width="900" height="420" fill="url(#fadeMask)" />
          </mask>
        </defs>
        <g mask="url(#graphFade)">
          {edges.map((e, i) => {
            const a = nodeById.get(e.a);
            const b = nodeById.get(e.b);
            if (!a || !b) return null;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={e.color}
                strokeWidth={e.faint ? 0.5 : 0.9}
                opacity={e.faint ? 0.12 : 0.28}
              />
            );
          })}
          {nodes.map((n) => (
            <circle
              key={n.id}
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={n.color}
              opacity={n.hub ? 0.9 : 0.55}
              className={n.hub ? "animate-node-pulse" : undefined}
              style={{ transformBox: "fill-box", transformOrigin: "center", animationDelay: `${n.delay}s` }}
            />
          ))}
        </g>
      </svg>

      <div className="absolute inset-0 hidden sm:block">
        {BADGES.map((b) => (
          <span
            key={b.label}
            className="glass animate-float absolute rounded-md px-2.5 py-1 font-mono text-[11px] font-medium text-[var(--color-text-secondary)]"
            style={{ left: b.left, top: b.top, animationDelay: `${b.label.length}00ms` }}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
