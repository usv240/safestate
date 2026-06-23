import { getHelp } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await ctx.params;
  try {
    const topic = await getHelp(topicId);
    if (!topic) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json(topic);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
