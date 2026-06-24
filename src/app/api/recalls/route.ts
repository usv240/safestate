import { getCpscRecalls, getLastIngest } from "@/lib/cpsc/ingest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [recalls, lastIngest] = await Promise.all([getCpscRecalls(), getLastIngest()]);
    return Response.json({ recalls, lastIngest });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
