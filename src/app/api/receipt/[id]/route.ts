import { getReceipt } from "@/lib/events/dynamo";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const r = await getReceipt(id);
    if (!r) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json(r);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
