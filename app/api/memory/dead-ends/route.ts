import { NextResponse } from "next/server";
import { computeDeadEndLibrary } from "@/lib/memory/stats";
import { handleRouteError } from "@/lib/api-utils";

export async function GET() {
  try {
    const deadEnds = await computeDeadEndLibrary();
    return NextResponse.json({ deadEnds });
  } catch (err) {
    return handleRouteError(err, "GET /api/memory/dead-ends");
  }
}
