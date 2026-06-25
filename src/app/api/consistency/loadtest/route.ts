import { loadTest } from "@/lib/safety/consistency";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  let n = 100;
  try {
    const body = await request.json();
    if (body && typeof body.n === "number") n = body.n;
  } catch {
    /* default */
  }
  try {
    return Response.json(await loadTest(n));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
