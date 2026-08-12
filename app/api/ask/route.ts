import { NextResponse } from "next/server";
import { z } from "zod";
import { askRecallX } from "@/lib/ask/reflect-ask";
import { handleRouteError, parseJsonBody } from "@/lib/api-utils";

const schema = z.object({
  question: z.string().min(3),
  serviceSlug: z.string().optional(),
  incidentKey: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;
  try {
    const answer = await askRecallX(parsed.data);
    return NextResponse.json(answer);
  } catch (err) {
    return handleRouteError(err, "POST /api/ask");
  }
}
