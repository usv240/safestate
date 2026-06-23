import "dotenv/config";
import { getPool, getPoolB, regionInfo } from "../src/lib/db/pool";
import { seedDemo } from "../src/lib/demo/seed";
import { issueDirective } from "../src/lib/safety/issueDirective";
import { DEMO } from "../src/lib/demo/fixtures";

async function main() {
  const info = regionInfo();
  console.log(`Region A: ${info.regionA}  |  Region B: ${info.regionB}  |  multiRegion: ${info.multiRegion}\n`);

  const poolB = getPoolB();
  if (!poolB) {
    console.log("No Region B endpoint configured — set DSQL_ENDPOINT_REGION_B.");
    process.exit(1);
  }

  await seedDemo();

  const before = await poolB.query("SELECT status, epoch FROM safety_guard WHERE model_id=$1", [DEMO.modelId]);
  console.log(`Region B reads BEFORE: ${before.rows[0].status} (epoch ${before.rows[0].epoch})`);

  const rec = await issueDirective({
    modelId: DEMO.modelId,
    kind: "RECALL",
    hazard: "Side rail can detach (entrapment hazard).",
    remedy: "Full refund.",
    source: "CPSC",
    target: { scope: "SERIAL_RANGE", rangeLo: "1", rangeHi: "999" },
  });
  console.log(`Wrote recall via Region A (${info.regionA}). guard epoch -> ${rec.newEpoch}`);

  const after = await poolB.query("SELECT status, epoch FROM safety_guard WHERE model_id=$1", [DEMO.modelId]);
  console.log(`Region B reads AFTER (immediately): ${after.rows[0].status} (epoch ${after.rows[0].epoch})`);

  console.log(
    after.rows[0].status === "RECALLED"
      ? "\nPASS — Region B saw the recall instantly. There is no stale-safe read across regions."
      : "\nFAIL — Region B still reads stale state.",
  );

  await getPool().end();
  await poolB.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
