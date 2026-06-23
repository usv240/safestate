import { seedDemo } from "@/lib/demo/seed";

export const dynamic = "force-dynamic";

/** Resets the demo fixtures to a known-good state (used by the "Reset" button). */
export async function POST() {
  try {
    await seedDemo();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
