import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-[var(--color-accent)] text-[#04140f] hover:brightness-110 font-semibold",
  secondary:
    "bg-[var(--color-surface-2)] text-[var(--color-text-primary)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-3)]",
  ghost: "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]",
  danger: "bg-[var(--color-critical-soft)] text-[var(--color-critical)] hover:brightness-125 font-semibold",
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "text-xs px-2.5 py-1.5 rounded-md",
  md: "text-sm px-3.5 py-2 rounded-lg",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`}
      {...props}
    />
  );
}
