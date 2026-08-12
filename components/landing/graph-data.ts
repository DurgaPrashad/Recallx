// Deterministic pseudo-random node/edge layout for the ambient memory-graph
// visuals. Seeded (not Math.random) so server-rendered and hydrated markup
// match exactly.
function mulberry32(seed: number) {
  let s = seed;
  return function rand() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  r: number;
  color: string;
  hub?: boolean;
  delay: number;
}

export interface GraphEdge {
  a: string;
  b: string;
  color: string;
  faint?: boolean;
}

interface Cluster {
  id: string;
  cx: number;
  cy: number;
  spread: number;
  color: string;
  count: number;
}

export function buildGraph(clusters: Cluster[], seed = 7) {
  const rand = mulberry32(seed);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const cluster of clusters) {
    const hubId = `${cluster.id}-hub`;
    nodes.push({
      id: hubId,
      x: cluster.cx,
      y: cluster.cy,
      r: 9,
      color: cluster.color,
      hub: true,
      delay: rand() * 2,
    });

    let prevId = hubId;
    for (let i = 0; i < cluster.count; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = cluster.spread * (0.35 + rand() * 0.65);
      const id = `${cluster.id}-${i}`;
      const x = cluster.cx + Math.cos(angle) * dist;
      const y = cluster.cy + Math.sin(angle) * dist * 0.6;
      nodes.push({ id, x, y, r: 2.5 + rand() * 3, color: cluster.color, delay: rand() * 3 });
      edges.push({ a: hubId, b: id, color: cluster.color, faint: rand() > 0.6 });
      if (i > 0 && rand() > 0.55) {
        edges.push({ a: prevId, b: id, color: cluster.color, faint: true });
      }
      prevId = id;
    }
  }

  // Faint cross-cluster edges between hubs to suggest a connected memory graph.
  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      edges.push({ a: `${clusters[i]!.id}-hub`, b: `${clusters[j]!.id}-hub`, color: "var(--color-text-muted)", faint: true });
    }
  }

  return { nodes, edges };
}

export const HERO_CLUSTERS: Cluster[] = [
  { id: "blue", cx: 190, cy: 190, spread: 130, color: "var(--color-cat-1)", count: 11 },
  { id: "red", cx: 470, cy: 300, spread: 90, color: "var(--color-critical)", count: 8 },
  { id: "green", cx: 700, cy: 150, spread: 120, color: "var(--color-accent)", count: 12 },
];
