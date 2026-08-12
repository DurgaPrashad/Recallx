import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { attempts, incidents, timelineEvents } from "@/db/schema";
import { id as genId, nowIso } from "@/lib/ids";
import { handleRouteError, jsonError, parseJsonBody } from "@/lib/api-utils";
import { eq } from "drizzle-orm";

const schema = z.object({
  action: z.string().min(2),
  hypothesis: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;
  try {
    const incident = await db.query.incidents.findFirst({ where: eq(incidents.id, id) });
    if (!incident) return jsonError(404, "Incident not found");

    const existing = await db.query.attempts.findMany({ where: eq(attempts.incidentId, id) });
    const attemptId = genId("att");
    const startedAt = nowIso();

    db.insert(attempts)
      .values({
        id: attemptId,
        incidentId: id,
        action: parsed.data.action,
        hypothesis: parsed.data.hypothesis ?? null,
        startedAt,
        endedAt: null,
        outcome: "pending",
        outcomeNotes: null,
        orderIndex: existing.length,
        memorySynced: false,
        createdAt: nowIso(),
      })
      .run();

    db.insert(timelineEvents)
      .values({
        id: genId("tl"),
        incidentId: id,
        timestamp: startedAt,
        type: "action",
        author: "On-call engineer",
        content: `Attempted: ${parsed.data.action}${parsed.data.hypothesis ? ` — hypothesis: ${parsed.data.hypothesis}` : ""}`,
        attemptId,
        createdAt: nowIso(),
      })
      .run();

    const attempt = await db.query.attempts.findFirst({ where: eq(attempts.id, attemptId) });
    return NextResponse.json({ attempt }, { status: 201 });
  } catch (err) {
    return handleRouteError(err, "POST /api/incidents/[id]/attempts");
  }
}
