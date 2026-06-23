import { regionInfo } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function GET() {
  const info = regionInfo();
  return Response.json({
    ...info,
    witnessRegion: process.env.DSQL_ENDPOINT_REGION_B ? "us-west-2" : null,
    endpointA: process.env.DSQL_ENDPOINT ?? null,
    endpointB: process.env.DSQL_ENDPOINT_REGION_B ?? null,
  });
}
