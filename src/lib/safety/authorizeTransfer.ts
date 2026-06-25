import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { withTxnRetry } from "../db/retry";

export type Decision = "AUTHORIZED" | "BLOCKED";

export interface AuthorizeInput {
  instanceId: string;
  toOwnerId: string;
  idempotencyKey: string;
  actor?: string;
}

export interface AuthorizeResult {
  decision: Decision;
  reason?: string;
  remedy?: string;
  source?: string;
  guardEpoch: number;
  attempts: number;
  idempotent: boolean;
}

interface DirectiveRow {
  id: string;
  kind: string;
  hazard: string | null;
  remedy: string | null;
  source: string | null;
  scope: string;
  range_lo: string | null;
  range_hi: string | null;
}

/** Does a directive target cover this specific instance's serial? */
export function serialCovered(serial: string | null, row: DirectiveRow): boolean {
  if (row.scope === "MODEL" || row.scope === "LOT") return true;
  if (serial == null) return false;
  if (row.scope === "UNIT") return row.range_lo != null && serial === row.range_lo;
  if (row.scope === "SERIAL_RANGE") {
    const { range_lo: lo, range_hi: hi } = row;
    if (lo == null || hi == null) return false;
    const ns = Number(serial), nlo = Number(lo), nhi = Number(hi);
    if (![ns, nlo, nhi].some(Number.isNaN)) return ns >= nlo && ns <= nhi;
    return serial >= lo && serial <= hi; // lexical fallback
  }
  return false;
}

/**
 * The heart of SafeState. Decides whether a resale/transfer is allowed,
 * precisely (serial-aware), and — crucially — writes the model's safety_guard
 * row on the AUTHORIZED path. That shared write is what makes Aurora DSQL's
 * OCC detect a conflict with a concurrent recall: the loser gets 40001/OC000
 * and the whole transaction retries, re-reading the now-recalled state.
 * This is the "no stale-safe read, ever" guarantee, in code.
 */
export async function authorizeTransfer(input: AuthorizeInput): Promise<AuthorizeResult> {
  const outcome = await withTxnRetry<AuthorizeResult>(async (client: PoolClient) => {
    // 1) Idempotency — a retried HTTP call returns the prior decision, never double-applies.
    const prior = await client.query(
      "SELECT decision, reason FROM transfer_attempts WHERE idempotency_key = $1",
      [input.idempotencyKey],
    );
    if (prior.rowCount && prior.rowCount > 0) {
      return {
        decision: prior.rows[0].decision as Decision,
        reason: prior.rows[0].reason ?? undefined,
        guardEpoch: -1,
        attempts: 0,
        idempotent: true,
      };
    }

    // 2) Load the instance.
    const inst = await client.query(
      "SELECT model_id, serial, current_owner_id FROM product_instances WHERE id = $1",
      [input.instanceId],
    );
    if (!inst.rowCount) throw new Error(`instance not found: ${input.instanceId}`);
    const { model_id, serial, current_owner_id } = inst.rows[0];

    // 3) Read the guard epoch. The conflict-forcing write is the UPDATE on the
    //    AUTHORIZED path below — a plain read here, so concurrent BLOCKED checks
    //    on the same model do not falsely contend, while a real recall (which
    //    UPDATEs this row) still collides with an AUTHORIZED sale.
    const guard = await client.query(
      "SELECT epoch FROM safety_guard WHERE model_id = $1",
      [model_id],
    );
    if (!guard.rowCount) throw new Error(`no safety_guard for model ${model_id}`);
    const guardEpoch = Number(guard.rows[0].epoch);

    // 4) Evaluate every active directive against THIS instance's serial.
    const dir = await client.query<DirectiveRow>(
      `SELECT d.id, d.kind, d.hazard, d.remedy, d.source, t.scope, t.range_lo, t.range_hi
         FROM safety_directives d
         JOIN directive_targets t ON t.directive_id = d.id
        WHERE d.model_id = $1
        ORDER BY d.issued_at DESC`,
      [model_id],
    );
    const blocking = dir.rows.find((row) => serialCovered(serial, row));

    if (blocking) {
      const reason = blocking.hazard ?? `${blocking.kind} directive in effect`;
      await client.query(
        "INSERT INTO transfer_attempts (idempotency_key, instance_id, decision, reason) VALUES ($1,$2,'BLOCKED',$3)",
        [input.idempotencyKey, input.instanceId, reason],
      );
      await client.query(
        "INSERT INTO audit_events (id, actor, action, payload) VALUES ($1,$2,'AUTHORIZE_TRANSFER',$3::jsonb)",
        [randomUUID(), input.actor ?? "system",
         JSON.stringify({ decision: "BLOCKED", instanceId: input.instanceId, directiveId: blocking.id })],
      );
      return {
        decision: "BLOCKED",
        reason,
        remedy: blocking.remedy ?? undefined,
        source: blocking.source ?? undefined,
        guardEpoch,
        attempts: 0,
        idempotent: false,
      };
    }

    // 5) AUTHORIZED — record transfer, flip ownership, and WRITE the guard row.
    //    The guard write is the conflict-forcing touch vs. a concurrent recall.
    const transferId = randomUUID();
    await client.query(
      "INSERT INTO ownership_transfers (id, instance_id, from_owner, to_owner, guard_epoch) VALUES ($1,$2,$3,$4,$5)",
      [transferId, input.instanceId, current_owner_id, input.toOwnerId, guardEpoch],
    );
    await client.query(
      "UPDATE product_instances SET current_owner_id = $1 WHERE id = $2",
      [input.toOwnerId, input.instanceId],
    );
    await client.query(
      "UPDATE safety_guard SET updated_at = now() WHERE model_id = $1",
      [model_id],
    );
    await client.query(
      "INSERT INTO transfer_attempts (idempotency_key, instance_id, decision, reason) VALUES ($1,$2,'AUTHORIZED',NULL)",
      [input.idempotencyKey, input.instanceId],
    );
    await client.query(
      "INSERT INTO audit_events (id, actor, action, payload) VALUES ($1,$2,'AUTHORIZE_TRANSFER',$3::jsonb)",
      [randomUUID(), input.actor ?? "system",
       JSON.stringify({ decision: "AUTHORIZED", instanceId: input.instanceId, transferId })],
    );

    return { decision: "AUTHORIZED", guardEpoch, attempts: 0, idempotent: false };
  });

  return { ...outcome.value, attempts: outcome.attempts };
}
