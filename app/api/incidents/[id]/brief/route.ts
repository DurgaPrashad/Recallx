import { NextResponse } from "next/server";
import { generateBrief } from "@/lib/brief/generate";
import { handleRouteError } from "@/lib/api-utils";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const demoOrderMaxParam = searchParams.get("demoOrderMax");
  const demoOrderMax = demoOrderMaxParam ? Number(demoOrderMaxParam) : undefined;

  try {
    const brief = await generateBrief(id, { demoOrderMax: Number.isFinite(demoOrderMax) ? demoOrderMax : undefined });
    return NextResponse.json(brief);
  } catch (err) {
    return handleRouteError(err, "GET /api/incidents/[id]/brief");
  }
}
