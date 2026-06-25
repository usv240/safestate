import { seedDemo } from "@/lib/demo/seed";
import { issueDirective } from "@/lib/safety/issueDirective";
import { DEMO } from "@/lib/demo/fixtures";

export const dynamic = "force-dynamic";

/**
 * Resets the demo to its intended, working state for the "Reset" button: a clean
 * baseline, then the canonical recall re-issued so the recalled unit (serial in
 * range 1-999) is BLOCKED and the safe unit is AUTHORIZED. This keeps the gate,
 * scan, and verify demos correct no matter how many times a judge resets.
 * (seedDemo alone stays the SAFE baseline used by the cross-region proof.)
 */
export async function POST() {
  try {
    await seedDemo();
    await issueDirective({
      modelId: DEMO.modelId,
      kind: "RECALL",
      hazard: "Side rail can detach (entrapment hazard).",
      remedy: "Full refund.",
      source: "CPSC",
      target: { scope: "SERIAL_RANGE", rangeLo: DEMO.recallRange.lo, rangeHi: DEMO.recallRange.hi },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
