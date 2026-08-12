import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseJsonBody<T>(req: Request, schema: ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: jsonError(400, "Request body must be valid JSON") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: jsonError(400, `Invalid request body: ${parsed.error.issues.map((i) => i.message).join("; ")}`) };
  }
  return { ok: true, data: parsed.data };
}

export function handleRouteError(err: unknown, context: string) {
  console.error(`[api] ${context} failed:`, err);
  const message = err instanceof Error ? err.message : "Unexpected server error";
  return jsonError(500, message);
}
