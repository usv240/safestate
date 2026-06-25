import { getActivity } from "@/lib/events/dynamo";

export const dynamic = "force-dynamic";

/** Live activity counters and recent events from the DynamoDB firehose. */
export async function GET() {
  try {
    const activity = await getActivity();
    return Response.json(activity);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
