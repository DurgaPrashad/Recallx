import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import { getIncidentFull } from "@/lib/incidents";
import { handleRouteError, jsonError, parseJsonBody } from "@/lib/api-utils";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const full = await getIncidentFull(id);
    if (!full) return jsonError(404, "Incident not found");
    return NextResponse.json(full);
  } catch (err) {
    return handleRouteError(err, "GET /api/incidents/[id]");
  }
}

const patchSchema = z.object({
  status: z.enum(["active", "monitoring", "resolved"]).optional(),
  assignedEngineerId: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJsonBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const existing = await db.query.incidents.findFirst({ where: eq(incidents.id, id) });
    if (!existing) return jsonError(404, "Incident not found");
    db.update(incidents)
      .set({ ...parsed.data })
      .where(eq(incidents.id, id))
      .run();
    const full = await getIncidentFull(id);
    return NextResponse.json(full);
  } catch (err) {
    return handleRouteError(err, "PATCH /api/incidents/[id]");
  }
}
