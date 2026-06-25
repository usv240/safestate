import { randomUUID, createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { scanCatalog } from "@/lib/safety/scan";
import { putReceipt } from "@/lib/events/dynamo";

export const dynamic = "force-dynamic";

/** Mint a durable Safety Receipt: re-check the unit server-side (never trust a
 *  client-claimed verdict), store it in DynamoDB with a content hash, return id. */
export async function POST(request: NextRequest) {
  let body: { model?: string; serial?: string | number | null };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const model = (body.model ?? "").toString().trim();
  const serial =
    body.serial != null && String(body.serial).trim() !== "" ? String(body.serial).trim() : null;
  if (!model) return Response.json({ error: "model is required" }, { status: 400 });

  try {
    const report = await scanCatalog([{ model, serial }]);
    const r = report.results[0];
    const id = randomUUID().replace(/-/g, "").slice(0, 10);
    const checkedAt = new Date().toISOString();
    const hash = createHash("sha256")
      .update([id, model, serial ?? "", r.status, checkedAt].join("|"))
      .digest("hex")
      .slice(0, 16);
    await putReceipt({
      id,
      model,
      serial,
      status: r.status,
      hazard: r.hazard,
      remedy: r.remedy,
      source: r.source,
      checkedAt,
      hash,
    });
    return Response.json({ id, hash });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
