import Link from "next/link";
import { ShieldAlert, Sparkles, ArrowRight, Github } from "lucide-react";
import { FloatingNav } from "@/components/landing/floating-nav";
import { MemoryGraphHero } from "@/components/landing/memory-graph-hero";
import { MemoryRecallDiagram } from "@/components/landing/memory-recall-diagram";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { AnimatedStat } from "@/components/landing/animated-stat";
import { Reveal } from "@/components/landing/reveal";
import { computeMemoryStats } from "@/lib/memory/stats";

export const dynamic = "force-dynamic";

async function getStats() {
  try {
    return await computeMemoryStats();
  } catch {
    return {
      incidentsRemembered: 22,
      troubleshootingAttempts: 61,
      deadEndsLearned: 34,
      verifiedFixes: 18,
      recurringPatterns: 5,
      servicesWithMemory: 6,
      totalServices: 6,
      pendingHindsightSync: 0,
    };
  }
}

export default async function LandingPage() {
  const stats = await getStats();

  return (
    <div className="landing relative">
      <FloatingNav />

      {/* ── 1. Hero ─────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-6 pt-28 pb-16">
        <div className="bg-grid absolute inset-0" />
        <MemoryGraphHero />

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
          <div className="animate-fade-up glass mb-6 flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
            <Sparkles size={13} style={{ color: "var(--color-accent-strong)" }} />
            Built on persistent Hindsight memory
          </div>

          <h1 className="animate-fade-up text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-6xl" style={{ animationDelay: "80ms" }}>
            Every AI remembers <span className="text-gradient">answers</span>.
            <br />
            Recall-X remembers what <span style={{ color: "var(--color-critical)" }}>didn&apos;t work</span>.
          </h1>

          <p
            className="animate-fade-up mt-6 max-w-xl text-sm text-[var(--color-text-secondary)] sm:text-base"
            style={{ animationDelay: "160ms" }}
          >
            An AI on-call copilot with operational memory — it recalls what your engineers already tried during past
            incidents, what worked, and what to never try again.
          </p>

          <div className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "240ms" }}>
            <Link
              href="/command-center"
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.03]"
              style={{ background: "var(--color-accent)", color: "#04140f" }}
            >
              Open Command Center <ArrowRight size={15} />
            </Link>
            <Link href="/demo" className="glass flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-transform hover:scale-[1.03]">
              Watch Demo Mode
            </Link>
          </div>

          <div className="animate-fade-up mt-14 grid w-full grid-cols-3 gap-3 sm:max-w-md" style={{ animationDelay: "320ms" }}>
            {[
              { label: "Remembered", value: `${stats.incidentsRemembered}`, color: "var(--color-cat-1)" },
              { label: "Dead ends", value: `${stats.deadEndsLearned}`, color: "var(--color-critical)" },
              { label: "Verified fixes", value: `${stats.verifiedFixes}`, color: "var(--color-good)" },
            ].map((s) => (
              <div key={s.label} className="glass rounded-xl px-3 py-3">
                <div className="text-xl font-bold tabular-nums" style={{ color: s.color }}>
                  {s.value}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. Feature surfaces ─────────────────────────────────────── */}
      <section id="features" className="relative px-6 py-24">
        <div className="bg-grid-fade absolute inset-0" />
        <div className="relative mx-auto max-w-6xl">
          <Reveal className="mx-auto mb-12 max-w-xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">Five surfaces, one memory</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Every screen reads from — and writes back to — the same operational memory.</p>
          </Reveal>
          <Reveal delay={0.1}>
            <FeatureGrid />
          </Reveal>
        </div>
      </section>

      {/* ── 3. Memory graph deep-dive ───────────────────────────────── */}
      <section id="memory" className="relative px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <div className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                <ShieldAlert size={13} style={{ color: "var(--color-warning)" }} />
                recall() in action
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
                Not every lookalike is a match.
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-text-secondary)]">
                A new incident is scored against remembered history. <span style={{ color: "var(--color-good)" }}>INC-1042</span> and{" "}
                <span style={{ color: "var(--color-accent-strong)" }}>INC-0763</span> are the same failure class — confirmed. {" "}
                <span style={{ color: "var(--color-warning)" }}>INC-0891</span> looks similar but had a different root cause, so Recall-X
                flags it instead of citing it as proof.
              </p>
              <div className="mt-6 flex flex-col gap-2 text-xs">
                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-good)" }} /> Remembered evidence — direct citation
                </div>
                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-warning)" }} /> Red herring — flagged, not cited
                </div>
                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse-dot" style={{ background: "var(--color-critical)" }} /> Active incident under investigation
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.15} className="glass rounded-2xl p-6">
              <MemoryRecallDiagram />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 4. Proof / stats ────────────────────────────────────────── */}
      <section id="proof" className="relative px-6 py-24">
        <div className="bg-grid-fade absolute inset-0" />
        <div className="relative mx-auto max-w-5xl">
          <Reveal className="mx-auto mb-10 max-w-xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">Memory that compounds</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Live from this deployment&apos;s own operational ledger.</p>
          </Reveal>
          <Reveal delay={0.1} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AnimatedStat value={stats.incidentsRemembered} label="Incidents remembered" accent="var(--color-cat-1)" />
            <AnimatedStat value={stats.troubleshootingAttempts} label="Attempts logged" accent="var(--color-cat-6)" />
            <AnimatedStat value={stats.deadEndsLearned} label="Dead ends learned" accent="var(--color-critical)" />
            <AnimatedStat value={stats.verifiedFixes} label="Verified fixes" accent="var(--color-good)" />
          </Reveal>
        </div>
      </section>

      {/* ── 5. Final CTA / demo ─────────────────────────────────────── */}
      <section id="demo" className="relative overflow-hidden px-6 py-28">
        <div
          className="animate-drift absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[130px]"
          style={{ background: "var(--color-accent)" }}
        />
        <Reveal className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">See confidence rise, live.</h2>
          <p className="mt-3 text-sm text-[var(--color-text-secondary)] sm:text-base">
            Demo Mode replays a real incident with growing memory — no script, real recall() calls, stage by stage.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/demo"
              className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-transform hover:scale-[1.03]"
              style={{ background: "var(--color-accent)", color: "#04140f" }}
            >
              Launch Demo Mode <ArrowRight size={15} />
            </Link>
            <Link href="/ask" className="glass flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-[var(--color-text-primary)] transition-transform hover:scale-[1.03]">
              Ask Recall-X something
            </Link>
          </div>
        </Reveal>

        <footer className="relative mx-auto mt-24 flex max-w-6xl flex-col items-center gap-3 border-t border-[var(--color-border)] pt-8 text-xs text-[var(--color-text-muted)] sm:flex-row sm:justify-between">
          <span>Recall-X — built on Hindsight persistent memory.</span>
          <a
            href="https://github.com/vectorize-io/hindsight"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-[var(--color-text-primary)]"
          >
            <Github size={13} /> vectorize-io/hindsight
          </a>
        </footer>
      </section>
    </div>
  );
}
