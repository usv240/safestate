import "dotenv/config";
import { randomUUID } from "node:crypto";
import { getPool } from "../src/lib/db/pool";
import { seedDemo } from "../src/lib/demo/seed";
import { DEMO } from "../src/lib/demo/fixtures";
import { authorizeTransfer } from "../src/lib/safety/authorizeTransfer";
import { issueDirective } from "../src/lib/safety/issueDirective";

const recallArgs = {
  modelId: DEMO.modelId,
  kind: "RECALL" as const,
  hazard: "Side rail can detach, posing a fall and entrapment hazard to infants.",
  remedy: "Stop use immediately. Contact the manufacturer for a full refund.",
  source: "CPSC",
  target: { scope: "SERIAL_RANGE" as const, rangeLo: DEMO.recallRange.lo, rangeHi: DEMO.recallRange.hi },
};

async function scenario1() {
  console.log("\n=== Scenario 1: recall is PRECISE + there is no stale-safe read ===");
  await seedDemo();
  const rec = await issueDirective(recallArgs);
  console.log(`Recall issued (CPSC). guard epoch -> ${rec.newEpoch}`);

  const blocked = await authorizeTransfer({ instanceId: DEMO.recalledInstanceId, toOwnerId: DEMO.buyerId, idempotencyKey: randomUUID() });
  console.log(`  recalled unit (serial ${DEMO.recalledSerial}): ${blocked.decision}${blocked.reason ? ` — ${blocked.reason}` : ""}`);

  const safe = await authorizeTransfer({ instanceId: DEMO.safeInstanceId, toOwnerId: DEMO.buyerId, idempotencyKey: randomUUID() });
  console.log(`  out-of-range unit (serial ${DEMO.safeSerial}): ${safe.decision}`);

  console.log(blocked.decision === "BLOCKED" && safe.decision === "AUTHORIZED" ? "  PASS - precise block, safe unit still sells" : "  FAIL");
}

async function scenario2() {
  console.log("\n=== Scenario 2: CONCURRENT recall vs transfer (optimistic concurrency) ===");
  await seedDemo();
  const [t, r] = await Promise.all([
    authorizeTransfer({ instanceId: DEMO.recalledInstanceId, toOwnerId: DEMO.buyerId, idempotencyKey: randomUUID() }),
    issueDirective(recallArgs),
  ]);
  console.log(`  transfer: ${t.decision} (attempts ${t.attempts})  |  recall: epoch ${r.newEpoch} (attempts ${r.attempts})`);
  console.log(
    t.decision === "AUTHORIZED"
      ? "  Transfer committed first; recall now applies -> every FUTURE read is BLOCKED, owner gets alerted."
      : "  Recall committed first; transfer correctly BLOCKED -> no stale-safe sale.",
  );
}

async function scenario3() {
  console.log("\n=== Scenario 3: raw DSQL OCC conflict (deterministic) ===");
  await seedDemo();
  const pool = getPool();
  const a = await pool.connect();
  const b = await pool.connect();
  try {
    await a.query("BEGIN");
    await b.query("BEGIN");
    await a.query("SELECT epoch FROM safety_guard WHERE model_id=$1", [DEMO.modelId]);
    await b.query("SELECT epoch FROM safety_guard WHERE model_id=$1", [DEMO.modelId]);
    await a.query("UPDATE safety_guard SET updated_at=now() WHERE model_id=$1", [DEMO.modelId]);
    await b.query("UPDATE safety_guard SET epoch=epoch+1 WHERE model_id=$1", [DEMO.modelId]);
    await a.query("COMMIT");
    console.log("  Txn A committed.");
    try {
      await b.query("COMMIT");
      console.log("  Txn B committed (no conflict surfaced this run).");
    } catch (e) {
      const err = e as { code?: string; message?: string };
      console.log(`  Txn B REJECTED with SQLSTATE ${err.code} - ${err.message?.split("\n")[0]}`);
      console.log("  ^ exactly the conflict our retry wrapper catches & retries. This is the guarantee.");
      await b.query("ROLLBACK").catch(() => {});
    }
  } finally {
    a.release();
    b.release();
  }
}

async function main() {
  await scenario1();
  await scenario2();
  await scenario3();
  await getPool().end();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
