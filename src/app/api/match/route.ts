import type { NextRequest } from "next/server";
import { z } from "zod";
import { matchListing, recentReviews } from "@/lib/ai/match";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({ text: z.string().min(3).max(2000) });

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid input" }, { status: 400 });
  }
  try {
    const result = await matchListing(parsed.data.text);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
    return Response.json({ reviews: await recentReviews() });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
