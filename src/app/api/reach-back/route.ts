import type { NextRequest } from "next/server";
import { getAffectedOwners } from "@/lib/db/queries";
import { DEMO } from "@/lib/demo/fixtures";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const modelId = new URL(request.url).searchParams.get("modelId") || DEMO.modelId;
  try {
    const data = await getAffectedOwners(modelId);
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
