import { getPool } from "@/lib/db/pool";
import { getActivity } from "@/lib/events/dynamo";

export const dynamic = "force-dynamic";

/** Live, real figures for the home page. */
export async function GET() {
  const pool = getPool();
  const [recalls, activity] = await Promise.all([
    pool
      .query("SELECT count(*)::int AS n FROM cpsc_recalls")
      .then((r) => Number(r.rows[0].n))
      .catch(() => 0),
    getActivity(),
  ]);
  return Response.json({
    recallsTracked: recalls,
    checksRun: activity.stats.check + activity.stats.verify + activity.stats.scan,
    agencies: 3,
    databases: 2,
  });
}
