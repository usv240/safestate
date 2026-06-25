import type { NextRequest } from "next/server";
import { z } from "zod";
import { issueDirective } from "@/lib/safety/issueDirective";
import { recordEvent } from "@/lib/events/dynamo";

export const dynamic = "force-dynamic";

const uuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "must be a uuid");

const Body = z.object({
  modelId: uuid,
  kind: z.enum(["RECALL", "REPAIR", "DESTROY"]),
  hazard: z.string().optional(),
  remedy: z.string().optional(),
  source: z.string().optional(),
  target: z.object({
    scope: z.enum(["MODEL", "LOT", "SERIAL_RANGE", "UNIT"]),
    rangeLo: z.string().optional(),
    rangeHi: z.string().optional(),
  }),
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
    const result = await issueDirective(parsed.data);
    await recordEvent("recall", `${parsed.data.kind} issued (${parsed.data.target.scope})`);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
