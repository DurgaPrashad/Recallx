import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recall-X — Every AI remembers answers. Recall-X remembers what didn't work.",
  description:
    "Recall-X is an AI-powered on-call incident copilot with persistent memory — it recalls what worked, and just as importantly, what didn't.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
