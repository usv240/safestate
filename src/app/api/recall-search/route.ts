import type { NextRequest } from "next/server";
import { searchAllSources } from "@/lib/recalls/sources";
import { recordEvent } from "@/lib/events/dynamo";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (!q) return Response.json({ error: "q is required" }, { status: 400 });
  if (q.length > 120) return Response.json({ error: "query too long" }, { status: 400 });
  try {
    const { hits, agencies } = await searchAllSources(q);
    await recordEvent("check", q);
    return Response.json({ query: q, agencies, count: hits.length, hits });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
