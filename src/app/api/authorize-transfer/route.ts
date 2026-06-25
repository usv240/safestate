import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorizeTransfer } from "@/lib/safety/authorizeTransfer";
import { recordEvent } from "@/lib/events/dynamo";

export const dynamic = "force-dynamic";

const uuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "must be a uuid");

const Body = z.object({
  instanceId: uuid,
  toOwnerId: uuid,
  idempotencyKey: z.string().min(8),
  actor: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const result = await authorizeTransfer(parsed.data);
    await recordEvent("authorize", result.decision === "BLOCKED" ? "sale blocked at gate" : "sale cleared at gate");
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
