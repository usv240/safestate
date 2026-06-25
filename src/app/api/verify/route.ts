import type { NextRequest } from "next/server";
import { scanCatalog } from "@/lib/safety/scan";

export const dynamic = "force-dynamic";

/**
 * Public, read-only recall check for a single unit. No state is mutated, so it
 * is safe to expose to anyone and to drive from a shared link or a QR code.
 * Returns the same verdict the marketplace gate would see, from live DSQL state.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const model = (searchParams.get("model") ?? "").trim();
  const serial = (searchParams.get("serial") ?? "").trim() || null;

  if (!model) {
    return Response.json({ error: "model is required" }, { status: 400 });
  }
  try {
    const report = await scanCatalog([{ model, serial }]);
    const r = report.results[0];
    return Response.json({ ...r, checkedAt: new Date().toISOString() });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
