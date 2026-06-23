import { getPool, getPoolB, regionInfo } from "../db/pool";
import { seedDemo } from "../demo/seed";
import { issueDirective } from "./issueDirective";
import { DEMO } from "../demo/fixtures";

/**
 * Deterministic optimistic-concurrency proof: two transactions write the same
 * guard row; one commits, the other is rejected with the DSQL conflict code.
 * Non-destructive (both only touch updated_at).
 */
export async function rawConflictProof() {
  const pool = getPool();
  const a = await pool.connect();
  const b = await pool.connect();
  try {
    await a.query("BEGIN");
    await b.query("BEGIN");
    await a.query("SELECT epoch FROM safety_guard WHERE model_id=$1", [DEMO.modelId]);
    await b.query("SELECT epoch FROM safety_guard WHERE model_id=$1", [DEMO.modelId]);
    await a.query("UPDATE safety_guard SET updated_at=now() WHERE model_id=$1", [DEMO.modelId]);
    await b.query("UPDATE safety_guard SET updated_at=now() WHERE model_id=$1", [DEMO.modelId]);
    await a.query("COMMIT");

    let loser: { code: string | null; subCode: string | null; message: string } | null = null;
    try {
      await b.query("COMMIT");
    } catch (e) {
      const err = e as { code?: string; message?: string };
      const message = err.message?.split("\n")[0] ?? "conflict";
      loser = {
        code: err.code ?? null,
        subCode: /OC\d{3}/.exec(message)?.[0] ?? null,
        message,
      };
      await b.query("ROLLBACK").catch(() => {});
    }
    return { winner: "Transaction A committed first", loser };
  } finally {
    a.release();
    b.release();
  }
}

/**
 * Cross-region strong-consistency proof: write a recall via Region A and read
 * it back from Region B's endpoint. Resets demo state first so BEFORE is SAFE.
 */
export async function crossRegionProof() {
  const info = regionInfo();
  const poolB = getPoolB();

  await seedDemo();

  const readGuard = async () => {
    const target = poolB ?? getPool();
    const r = await target.query("SELECT status, epoch FROM safety_guard WHERE model_id=$1", [
      DEMO.modelId,
    ]);
    return { status: r.rows[0].status as string, epoch: Number(r.rows[0].epoch) };
  };

  const before = await readGuard();
  const rec = await issueDirective({
    modelId: DEMO.modelId,
    kind: "RECALL",
    hazard: "Side rail can detach (entrapment hazard).",
    remedy: "Full refund.",
    source: "CPSC",
    target: { scope: "SERIAL_RANGE", rangeLo: "1", rangeHi: "999" },
  });
  const after = await readGuard();

  return {
    regionA: info.regionA,
    regionB: info.regionB ?? info.regionA,
    multiRegion: info.multiRegion,
    before,
    after,
    epoch: rec.newEpoch,
    instant: after.status === "RECALLED",
  };
}
