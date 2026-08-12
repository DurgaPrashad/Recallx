"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/command-center", label: "Command Center" },
  { href: "/ask", label: "Ask Recall-X" },
  { href: "/memory", label: "Memory Explorer" },
  { href: "/dead-ends", label: "Dead-End Library" },
  { href: "/demo", label: "Demo Mode" },
];

function StatusPill() {
  const [status, setStatus] = useState<{ hindsightConnected: boolean; llmConfigured: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus({ hindsightConnected: false, llmConfigured: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) {
    return <span className="text-xs text-[var(--color-text-muted)]">Checking memory service…</span>;
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="flex items-center gap-1.5" style={{ color: status.hindsightConnected ? "var(--color-good)" : "var(--color-warning)" }}>
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: status.hindsightConnected ? "var(--color-good)" : "var(--color-warning)" }}
        />
        {status.hindsightConnected ? "Memory connected" : "Memory offline — cached mode"}
      </span>
      {!status.llmConfigured && <span className="text-[var(--color-text-muted)]">· LLM key not set (rule-based mode)</span>}
    </div>
  );
}

export function Nav() {
  const pathname = usePathname();
  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur"
      style={{ background: "rgba(10,11,13,0.85)", borderColor: "var(--color-border)" }}
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-8 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold"
            style={{ background: "var(--color-accent)", color: "#04140f" }}
          >
            R
          </span>
          <span className="text-sm font-bold tracking-tight text-[var(--color-text-primary)]">Recall-X</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  background: active ? "var(--color-surface-2)" : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <StatusPill />
      </div>
    </header>
  );
}
