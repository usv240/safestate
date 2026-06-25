import type { NextRequest } from "next/server";
import { z } from "zod";
import { scanCatalog } from "@/lib/safety/scan";
import { recordEvent } from "@/lib/events/dynamo";

export const dynamic = "force-dynamic";

const Item = z.object({
  model: z.string().min(1).max(200),
  serial: z.union([z.string(), z.number()]).optional().nullable(),
  sku: z.string().max(120).optional().nullable(),
});

const Body = z.object({ items: z.array(Item).min(1).max(1000) });

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
    const items = parsed.data.items.map((i) => ({
      model: i.model,
      serial: i.serial == null ? null : String(i.serial),
      sku: i.sku ?? null,
    }));
    const report = await scanCatalog(items);
    await recordEvent("scan", `${report.summary.total} units, ${report.summary.blocked} recalled`);
    return Response.json(report);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
