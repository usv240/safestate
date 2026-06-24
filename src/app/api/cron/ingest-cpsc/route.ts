import { ingestCpsc } from "@/lib/cpsc/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron target. When CRON_SECRET is set, Vercel sends it as a Bearer token. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  try {
    const result = await ingestCpsc();
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
