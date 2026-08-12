"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/nav";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1400px] px-6 py-8">{children}</main>
    </>
  );
}
