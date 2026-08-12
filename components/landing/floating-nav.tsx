"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "features", label: "Surfaces" },
  { id: "memory", label: "Memory graph" },
  { id: "proof", label: "Proof" },
  { id: "demo", label: "Demo" },
];

export function FloatingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        className="glass-strong flex w-full max-w-[880px] items-center gap-1 rounded-full px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)] transition-all duration-300"
        style={{ transform: scrolled ? "translateY(0) scale(0.98)" : "translateY(0) scale(1)" }}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2 pl-2 pr-3">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold"
            style={{ background: "var(--color-accent)", color: "#04140f" }}
          >
            R
          </span>
          <span className="hidden text-sm font-bold tracking-tight text-[var(--color-text-primary)] sm:inline">Recall-X</span>
        </Link>

        <div className="hidden flex-1 items-center gap-0.5 md:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-white/5 hover:text-[var(--color-text-primary)]"
            >
              {s.label}
            </a>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
          <Link
            href="/demo"
            className="hidden rounded-full px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] sm:inline-block"
          >
            Demo Mode
          </Link>
          <Link
            href="/command-center"
            className="rounded-full px-4 py-1.5 text-xs font-semibold transition-transform hover:scale-[1.03]"
            style={{ background: "var(--color-accent)", color: "#04140f" }}
          >
            Open Command Center →
          </Link>
        </div>
      </nav>
    </div>
  );
}
