import { getPool, regionInfo } from "@/lib/db/pool";
import { pingDynamo } from "@/lib/events/dynamo";

export const dynamic = "force-dynamic";

/** Live reachability of both databases, for the frontend status indicator. */
export async function GET() {
  const info = regionInfo();
  const ddbRegion = process.env.SAFESTATE_DDB_REGION || "us-east-1";

  const [dsqlOk, ddbOk] = await Promise.all([
    getPool().query("SELECT 1").then(() => true).catch(() => false),
    pingDynamo(),
  ]);

  const regions = info.multiRegion ? `${info.regionA} + ${info.regionB}` : info.regionA;

  return Response.json({
    primary: {
      name: "Amazon Aurora DSQL",
      role: "primary",
      status: dsqlOk ? "ok" : "down",
      detail: `Transactional core. Multi-region active-active (${regions}) with strong consistency.`,
    },
    secondary: {
      name: "Amazon DynamoDB",
      role: "secondary",
      status: ddbOk ? "ok" : "down",
      detail: `Activity firehose (${ddbRegion}). Append-only events and atomic counters.`,
    },
  });
}
