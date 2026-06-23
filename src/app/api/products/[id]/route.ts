import { getProductStatus } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const data = await getProductStatus(id);
    if (!data) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
