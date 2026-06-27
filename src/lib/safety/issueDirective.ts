import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { withTxnRetry } from "../db/retry";

export type DirectiveKind = "RECALL" | "REPAIR" | "DESTROY";
export type TargetScope = "MODEL" | "LOT" | "SERIAL_RANGE" | "UNIT";

export interface IssueDirectiveInput {
  modelId: string;
  kind: DirectiveKind;
  hazard?: string;
  remedy?: string;
  source?: string; // e.g. "CPSC"
  target: { scope: TargetScope; rangeLo?: string; rangeHi?: string };
  actor?: string;
}

export interface IssueDirectiveResult {
  directiveId: string;
  newEpoch: number;
  attempts: number;
}

const GUARD_STATUS: Record<DirectiveKind, string> = {
  RECALL: "RECALLED",
  REPAIR: "REPAIR_REQUIRED",
  DESTROY: "DESTROYED",
};

/**
 * Publishes a safety directive (recall/repair/destroy) and bumps the model's
 * safety_guard epoch + status. The guard UPDATE here writes the SAME row that
 * authorizeTransfer writes, that shared write is what makes DSQL's OCC detect
 * a recall-vs-transfer conflict deterministically.
 */
export async function issueDirective(input: IssueDirectiveInput): Promise<IssueDirectiveResult> {
  const outcome = await withTxnRetry<IssueDirectiveResult>(async (client: PoolClient) => {
    const directiveId = randomUUID();

    await client.query(
      `INSERT INTO safety_directives (id, model_id, kind, hazard, remedy, source)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [directiveId, input.modelId, input.kind, input.hazard ?? null, input.remedy ?? null, input.source ?? null],
    );
    await client.query(
      `INSERT INTO directive_targets (id, directive_id, scope, range_lo, range_hi)
       VALUES ($1,$2,$3,$4,$5)`,
      [randomUUID(), directiveId, input.target.scope, input.target.rangeLo ?? null, input.target.rangeHi ?? null],
    );

    // The conflict-forcing write on the shared guard row.
    const upd = await client.query(
      `UPDATE safety_guard
          SET status = $2, epoch = epoch + 1, updated_at = now()
        WHERE model_id = $1
        RETURNING epoch`,
      [input.modelId, GUARD_STATUS[input.kind]],
    );
    if (!upd.rowCount) throw new Error(`no safety_guard for model ${input.modelId}`);
    const newEpoch = Number(upd.rows[0].epoch);

    await client.query(
      "INSERT INTO audit_events (id, actor, action, payload) VALUES ($1,$2,'ISSUE_DIRECTIVE',$3::jsonb)",
      [randomUUID(), input.actor ?? "manufacturer",
       JSON.stringify({ directiveId, kind: input.kind, modelId: input.modelId })],
    );

    return { directiveId, newEpoch, attempts: 0 };
  });

  return { ...outcome.value, attempts: outcome.attempts };
}
