import { NextResponse } from "next/server";
import { computeMemoryStats, computeRecurringPatterns, computeServiceMemorySummaries } from "@/lib/memory/stats";
import { getBankStats, HindsightUnavailableError } from "@/lib/hindsight/client";
import { handleRouteError } from "@/lib/api-utils";

export async function GET() {
  try {
    const [stats, patterns, serviceSummaries] = await Promise.all([
      computeMemoryStats(),
      computeRecurringPatterns(),
      computeServiceMemorySummaries(),
    ]);

    let bankStats = null;
    let hindsightConnected = true;
    try {
      bankStats = await getBankStats();
    } catch (err) {
      if (!(err instanceof HindsightUnavailableError)) throw err;
      hindsightConnected = false;
    }

    return NextResponse.json({ stats, patterns, serviceSummaries, bankStats, hindsightConnected });
  } catch (err) {
    return handleRouteError(err, "GET /api/memory/stats");
  }
}
