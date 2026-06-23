import { crossRegionProof } from "@/lib/safety/consistency";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return Response.json(await crossRegionProof());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
