import { getContent, getTutorial } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ surface: string }> }) {
  const { surface } = await ctx.params;
  try {
    const [blocks, tutorial] = await Promise.all([getContent(surface), getTutorial(surface)]);
    return Response.json({ blocks, tutorial });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
