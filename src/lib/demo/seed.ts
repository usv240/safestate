import { withTxnRetry } from "../db/retry";
import { DEMO } from "./fixtures";

/** Idempotent: wipes and re-creates the demo fixtures so scripts/scenarios
 *  always start from a known-good, deterministic state. */
export async function seedDemo(): Promise<void> {
  await withTxnRetry(async (client) => {
    // reset (children first; relationships are app-enforced, no FKs)
    await client.query(
      "DELETE FROM directive_targets WHERE directive_id IN (SELECT id FROM safety_directives WHERE model_id = $1)",
      [DEMO.modelId],
    );
    await client.query("DELETE FROM safety_directives WHERE model_id = $1", [DEMO.modelId]);
    await client.query("DELETE FROM transfer_attempts WHERE instance_id IN ($1,$2)", [DEMO.recalledInstanceId, DEMO.safeInstanceId]);
    await client.query("DELETE FROM ownership_transfers WHERE instance_id IN ($1,$2)", [DEMO.recalledInstanceId, DEMO.safeInstanceId]);
    await client.query("DELETE FROM product_instances WHERE id IN ($1,$2)", [DEMO.recalledInstanceId, DEMO.safeInstanceId]);
    await client.query("DELETE FROM safety_guard WHERE model_id = $1", [DEMO.modelId]);
    await client.query("DELETE FROM product_models WHERE id = $1", [DEMO.modelId]);
    await client.query("DELETE FROM manufacturers WHERE id = $1", [DEMO.manufacturerId]);

    // insert
    await client.query("INSERT INTO manufacturers (id, name) VALUES ($1,$2)", [DEMO.manufacturerId, DEMO.manufacturerName]);
    await client.query(
      "INSERT INTO product_models (id, manufacturer_id, name, category) VALUES ($1,$2,$3,$4)",
      [DEMO.modelId, DEMO.manufacturerId, DEMO.modelName, DEMO.category],
    );
    await client.query("INSERT INTO safety_guard (model_id, status, epoch) VALUES ($1,'SAFE',0)", [DEMO.modelId]);
    await client.query(
      "INSERT INTO product_instances (id, model_id, serial, current_owner_id, status) VALUES ($1,$2,$3,$4,'SAFE')",
      [DEMO.recalledInstanceId, DEMO.modelId, DEMO.recalledSerial, DEMO.sellerId],
    );
    await client.query(
      "INSERT INTO product_instances (id, model_id, serial, current_owner_id, status) VALUES ($1,$2,$3,$4,'SAFE')",
      [DEMO.safeInstanceId, DEMO.modelId, DEMO.safeSerial, DEMO.sellerId],
    );
  });
}
