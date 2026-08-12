import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { attempts, timelineEvents } from "@/db/schema";
import { getIncidentFull } from "@/lib/incidents";
import { id as genId, nowIso } from "@/lib/ids";
import { handleRouteError, jsonError, parseJsonBody } from "@/lib/api-utils";
import { eq } from "drizzle-orm";
import { HindsightUnavailableError } from "@/lib/hindsight/client";
import { retainAttempt, retainIncidentContext } from "@/lib/memory/retain";

const schema = z.object({
  outcome: z.enum(["solved", "partial", "failed", "inconclusive"]),
  outcomeNotes: z.string().min(1),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { id, attemptId } = await params;
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;

  try {
    const full = await getIncidentFull(id);
    if (!full) return jsonError(404, "Incident not found");
    const attempt = full.attempts.find((a) => a.id === attemptId);
    if (!attempt) return jsonError(404, "Attempt not found");

    const endedAt = attempt.endedAt ?? nowIso();
    await db.update(attempts)
      .set({ outcome: parsed.data.outcome, outcomeNotes: parsed.data.outcomeNotes, endedAt })
      .where(eq(attempts.id, attemptId))
      .run();

    await db.insert(timelineEvents)
      .values({
        id: genId("tl"),
        incidentId: id,
        timestamp: endedAt,
        type: "observation",
        author: "On-call engineer",
        content: parsed.data.outcomeNotes,
        attemptId,
        createdAt: nowIso(),
      })
      .run();

    let memoryLearned = false;
    let hindsightAvailable = true;
    try {
      const alreadySynced = full.attempts.some((a) => a.memorySynced) || Boolean(full.resolution?.memorySynced);
      if (!alreadySynced) {
        await retainIncidentContext(full.incident, full.service, full.incident.startedAt);
      }
      await retainAttempt(
        full.incident,
        full.service,
        { ...attempt, outcome: parsed.data.outcome, outcomeNotes: parsed.data.outcomeNotes, endedAt },
        endedAt
      );
      await db.update(attempts).set({ memorySynced: true }).where(eq(attempts.id, attemptId)).run();
      memoryLearned = true;
    } catch (err) {
      if (!(err instanceof HindsightUnavailableError)) throw err;
      hindsightAvailable = false;
      console.warn(`[api] Hindsight unavailable, attempt ${attemptId} recorded locally only`);
    }

    const updatedAttempt = await db.query.attempts.findFirst({ where: eq(attempts.id, attemptId) });
    return NextResponse.json({ attempt: updatedAttempt, memoryLearned, hindsightAvailable });
  } catch (err) {
    return handleRouteError(err, "PATCH /api/incidents/[id]/attempts/[attemptId]");
  }
}
