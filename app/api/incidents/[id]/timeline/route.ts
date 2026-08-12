import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { incidents, timelineEvents } from "@/db/schema";
import { id as genId, nowIso } from "@/lib/ids";
import { handleRouteError, jsonError, parseJsonBody } from "@/lib/api-utils";
import { eq } from "drizzle-orm";

const schema = z.object({
  type: z.enum(["note", "hypothesis", "observation"]),
  content: z.string().min(1),
  author: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;
  try {
    const incident = await db.query.incidents.findFirst({ where: eq(incidents.id, id) });
    if (!incident) return jsonError(404, "Incident not found");

    const eventId = genId("tl");
    await db.insert(timelineEvents)
      .values({
        id: eventId,
        incidentId: id,
        timestamp: nowIso(),
        type: parsed.data.type,
        author: parsed.data.author ?? "On-call engineer",
        content: parsed.data.content,
        attemptId: null,
        createdAt: nowIso(),
      })
      .run();

    const event = await db.query.timelineEvents.findFirst({ where: eq(timelineEvents.id, eventId) });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    return handleRouteError(err, "POST /api/incidents/[id]/timeline");
  }
}
