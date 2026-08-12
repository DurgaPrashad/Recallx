import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { incidents, resolutions, timelineEvents } from "@/db/schema";
import { getIncidentFull } from "@/lib/incidents";
import { id as genId, nowIso } from "@/lib/ids";
import { handleRouteError, jsonError, parseJsonBody } from "@/lib/api-utils";
import { eq } from "drizzle-orm";
import { HindsightUnavailableError } from "@/lib/hindsight/client";
import { retainIncidentContext, retainResolution } from "@/lib/memory/retain";

const schema = z.object({
  rootCause: z.string().min(3),
  fixSummary: z.string().min(3),
  lessonsLearned: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;

  try {
    const full = await getIncidentFull(id);
    if (!full) return jsonError(404, "Incident not found");
    if (full.resolution) return jsonError(409, "Incident already has a resolution");

    const resolvedAt = nowIso();
    const timeToResolutionMin = Math.round((new Date(resolvedAt).getTime() - new Date(full.incident.startedAt).getTime()) / 60_000);

    const resolutionId = genId("res");
    db.insert(resolutions)
      .values({
        id: resolutionId,
        incidentId: id,
        rootCause: parsed.data.rootCause,
        fixSummary: parsed.data.fixSummary,
        lessonsLearned: parsed.data.lessonsLearned ?? null,
        timeToResolutionMin,
        memorySynced: false,
        createdAt: resolvedAt,
      })
      .run();

    db.update(incidents).set({ status: "resolved", resolvedAt }).where(eq(incidents.id, id)).run();

    db.insert(timelineEvents)
      .values({
        id: genId("tl"),
        incidentId: id,
        timestamp: resolvedAt,
        type: "resolution",
        author: "On-call engineer",
        content: `Resolved: ${parsed.data.fixSummary}`,
        attemptId: null,
        createdAt: nowIso(),
      })
      .run();

    let hindsightAvailable = true;
    try {
      const alreadySynced = full.attempts.some((a) => a.memorySynced);
      if (!alreadySynced) {
        await retainIncidentContext(full.incident, full.service, full.incident.startedAt);
      }
      await retainResolution(
        full.incident,
        full.service,
        {
          id: resolutionId,
          incidentId: id,
          rootCause: parsed.data.rootCause,
          fixSummary: parsed.data.fixSummary,
          lessonsLearned: parsed.data.lessonsLearned ?? null,
          timeToResolutionMin,
          memorySynced: false,
          createdAt: resolvedAt,
        },
        resolvedAt
      );
      db.update(resolutions).set({ memorySynced: true }).where(eq(resolutions.id, resolutionId)).run();
    } catch (err) {
      if (!(err instanceof HindsightUnavailableError)) throw err;
      hindsightAvailable = false;
      console.warn(`[api] Hindsight unavailable, resolution for ${full.incident.key} recorded locally only`);
    }

    const deadEnds = full.attempts.filter((a) => a.outcome === "failed" || a.outcome === "partial").length;
    const investigationSignals = full.timeline.filter((t) => t.type === "note" || t.type === "hypothesis" || t.type === "observation").length;

    return NextResponse.json({
      resolution: await db.query.resolutions.findFirst({ where: eq(resolutions.id, resolutionId) }),
      hindsightAvailable,
      memoryUpdateSummary: {
        confirmedRootCause: 1,
        investigationSignals,
        deadEnds,
        verifiedFixes: 1,
      },
    });
  } catch (err) {
    return handleRouteError(err, "POST /api/incidents/[id]/resolve");
  }
}
