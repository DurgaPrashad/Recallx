"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedStat({
  value,
  label,
  suffix = "",
  accent,
}: {
  value: number;
  label: string;
  suffix?: string;
  accent?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !started.current) {
          started.current = true;
          const duration = 900;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(value * eased));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="glass rounded-2xl px-5 py-6 text-center">
      <div className="text-3xl font-bold tabular-nums sm:text-4xl" style={{ color: accent ?? "var(--color-text-primary)" }}>
        {display}
        {suffix}
      </div>
      <div className="mt-1.5 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{label}</div>
    </div>
  );
}
