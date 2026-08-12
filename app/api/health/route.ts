import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/hindsight/client";
import { getEnv } from "@/lib/env";

export async function GET() {
  const env = getEnv();
  const hindsightConnected = await checkHealth();
  return NextResponse.json({
    hindsightConnected,
    llmConfigured: Boolean(env.ANTHROPIC_API_KEY),
  });
}
