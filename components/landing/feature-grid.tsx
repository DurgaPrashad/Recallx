import Link from "next/link";
import { Activity, MessageCircle, Network, Ban, PlayCircle, ArrowUpRight } from "lucide-react";

interface Feature {
  href: string;
  label: string;
  tagline: string;
  color: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  big?: boolean;
  visual: React.ReactNode;
}

function CommandCenterVisual() {
  return (
    <div className="mt-4 flex flex-col gap-1.5">
      {[
        { sev: "var(--color-critical)", w: "86%", match: 92 },
        { sev: "var(--color-warning)", w: "64%", match: 58 },
        { sev: "var(--color-good)", w: "74%", match: 34 },
      ].map((row, i) => (
        <div key={i} className="flex items-center gap-2 rounded-md bg-white/[0.04] px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: row.sev }} />
          <span className="h-1.5 flex-1 rounded-full bg-white/10">
            <span className="block h-full rounded-full" style={{ width: row.w, background: row.sev, opacity: 0.6 }} />
          </span>
          <span className="text-[9px] font-semibold tabular-nums text-[var(--color-text-muted)]">{row.match}%</span>
        </div>
      ))}
    </div>
  );
}

function AskVisual() {
  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="max-w-[85%] rounded-lg rounded-bl-sm bg-white/[0.06] px-3 py-2 text-[10px] text-[var(--color-text-secondary)]">
        Have we seen this before?
      </div>
      <div className="ml-auto flex max-w-[90%] flex-col gap-1 rounded-lg rounded-br-sm px-3 py-2" style={{ background: "var(--color-accent-soft)" }}>
        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "var(--color-accent-strong)" }}>
          Remembered
        </span>
        <span className="text-[10px] text-[var(--color-text-secondary)]">3 prior attempts, 2 failed identically.</span>
      </div>
    </div>
  );
}

function MemoryVisual() {
  return (
    <svg viewBox="0 0 140 60" className="mt-4 h-14 w-full">
      {[
        [20, 30, 50, 15],
        [20, 30, 50, 45],
        [50, 15, 90, 20],
        [50, 45, 90, 42],
        [90, 20, 120, 30],
        [90, 42, 120, 30],
      ].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-cat-6)" strokeWidth="0.75" opacity="0.4" />
      ))}
      {[
        [20, 30, 4],
        [50, 15, 3],
        [50, 45, 3],
        [90, 20, 3],
        [90, 42, 3],
        [120, 30, 5],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="var(--color-cat-6)" opacity={i === 5 ? 0.9 : 0.6} />
      ))}
    </svg>
  );
}

function DeadEndVisual() {
  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/10">
        <span style={{ width: "20%", background: "var(--color-good)" }} />
        <span style={{ width: "15%", background: "var(--color-warning)" }} />
        <span style={{ width: "65%", background: "var(--color-critical)" }} />
      </div>
      <span className="text-[10px] text-[var(--color-text-muted)]">
        &ldquo;Restart the pods&rdquo; — tried 4×, <span style={{ color: "var(--color-critical)" }}>65% no impact</span>
      </span>
    </div>
  );
}

function DemoVisual() {
  return (
    <div className="mt-4 flex items-center gap-1.5">
      {["S1", "S2", "S3", "S4"].map((s, i) => (
        <div key={s} className="flex flex-1 items-center gap-1.5">
          <div
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
            style={{
              background: i < 2 ? "var(--color-accent)" : "var(--color-surface-3)",
              color: i < 2 ? "#04140f" : "var(--color-text-muted)",
            }}
          >
            {i + 1}
          </div>
          {i < 3 && <div className="h-px flex-1" style={{ background: i < 1 ? "var(--color-accent)" : "var(--color-border-strong)" }} />}
        </div>
      ))}
    </div>
  );
}

const FEATURES: Feature[] = [
  {
    href: "/command-center",
    label: "Command Center",
    tagline: "Live incidents, severity, and memory-match at a glance.",
    color: "var(--color-cat-1)",
    icon: Activity,
    big: true,
    visual: <CommandCenterVisual />,
  },
  {
    href: "/ask",
    label: "Ask Recall-X",
    tagline: "Conversational investigation — remembered vs. inferred.",
    color: "var(--color-accent-strong)",
    icon: MessageCircle,
    visual: <AskVisual />,
  },
  {
    href: "/memory",
    label: "Memory Explorer",
    tagline: "Org-wide stats and the live Hindsight memory graph.",
    color: "var(--color-cat-6)",
    icon: Network,
    visual: <MemoryVisual />,
  },
  {
    href: "/dead-ends",
    label: "Dead-End Library",
    tagline: "Every troubleshooting step tried — including failures.",
    color: "var(--color-serious)",
    icon: Ban,
    visual: <DeadEndVisual />,
  },
  {
    href: "/demo",
    label: "Demo Mode",
    tagline: "Watch confidence rise as memory accumulates, live.",
    color: "var(--color-warning)",
    icon: PlayCircle,
    big: true,
    visual: <DemoVisual />,
  },
];

export function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
      {FEATURES.map((f) => {
        const Icon = f.icon;
        return (
          <Link
            key={f.href}
            href={f.href}
            className={`glass group relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 ${
              f.big ? "lg:col-span-2 lg:row-span-1" : "lg:col-span-1 lg:row-span-1"
            }`}
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl transition-opacity duration-300 group-hover:opacity-35"
              style={{ background: f.color }}
            />
            <div className="relative flex items-start justify-between">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: `color-mix(in srgb, ${f.color} 18%, transparent)` }}
              >
                <Icon size={18} strokeWidth={2} style={{ color: f.color }} />
              </div>
              <ArrowUpRight size={16} className="text-[var(--color-text-muted)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
            <div className="relative mt-3">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{f.label}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">{f.tagline}</p>
              {f.visual}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
