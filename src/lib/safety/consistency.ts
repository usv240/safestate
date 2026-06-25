import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool, getPoolB, regionInfo } from "../db/pool";
import { seedDemo } from "../demo/seed";
import { issueDirective } from "./issueDirective";
import { authorizeTransfer } from "./authorizeTransfer";
import { DEMO } from "../demo/fixtures";

/**
 * Deterministic in outcome (one loses) but a GENUINE concurrent race: two
 * transactions run in parallel, both read the guard snapshot, both update the
 * same row, and both try to commit at once. DSQL's optimistic concurrency lets
 * one commit and rejects the other with 40001 / OC000. The winner is whichever
 * commit lands first, so it varies run to run. Non-destructive (touches only
 * updated_at).
 */
export async function rawConflictProof() {
  const pool = getPool();
  const a = await pool.connect();
  const b = await pool.connect();

  const txn = async (client: PoolClient) => {
    await client.query("BEGIN");
    await client.query("SELECT epoch FROM safety_guard WHERE model_id=$1", [DEMO.modelId]);
    // hold the snapshot briefly so both transactions overlap for real
    await new Promise((r) => setTimeout(r, 10));
    await client.query("UPDATE safety_guard SET updated_at=now() WHERE model_id=$1", [DEMO.modelId]);
    await client.query("COMMIT");
  };

  try {
    const [ra, rb] = await Promise.allSettled([txn(a), txn(b)]);
    const lanes = [
      { label: "Transaction A", res: ra },
      { label: "Transaction B", res: rb },
    ];
    const loser = lanes.find((x) => x.res.status === "rejected");
    const winner = lanes.find((x) => x.res.status === "fulfilled");

    if (loser && winner) {
      const err = (loser.res as PromiseRejectedResult).reason as { code?: string; message?: string };
      const message = err.message?.split("\n")[0] ?? "conflict";
      return {
        winner: `${winner.label} committed first`,
        loser: {
          label: loser.label,
          code: err.code ?? null,
          subCode: /OC\d{3}/.exec(message)?.[0] ?? null,
          message,
        },
      };
    }
    // Both committed (no conflict detected this run) — rare; report honestly.
    return { winner: "Both committed (no conflict this run)", loser: null };
  } finally {
    await a.query("ROLLBACK").catch(() => {});
    await b.query("ROLLBACK").catch(() => {});
    a.release();
    b.release();
  }
}

/**
 * Correctness under load. Fire N concurrent sale attempts at a RECALLED unit
 * against the live cluster. Every one must be blocked — no level of concurrency
 * may let a recalled unit sell. Reports throughput and latency, and cleans up
 * its own idempotency rows afterward.
 */
export async function loadTest(n = 100) {
  const count = Math.min(Math.max(Math.floor(n) || 100, 1), 200);
  const runId = randomUUID().slice(0, 8);
  const started = Date.now();
  const latencies: number[] = [];
  let blocked = 0;
  let authorized = 0;
  let errors = 0;
  let retries = 0;

  await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const t0 = Date.now();
      try {
        const res = await authorizeTransfer({
          instanceId: DEMO.recalledInstanceId,
          toOwnerId: DEMO.buyerId,
          idempotencyKey: `lt-${runId}-${i}`,
          actor: "loadtest",
        });
        if (res.decision === "BLOCKED") blocked++;
        else authorized++;
        retries += Math.max(0, (res.attempts ?? 1) - 1);
      } catch {
        errors++;
      }
      latencies.push(Date.now() - t0);
    }),
  );

  const durationMs = Date.now() - started;
  latencies.sort((x, y) => x - y);
  const pct = (p: number) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))] ?? 0;

  try {
    await getPool().query("DELETE FROM transfer_attempts WHERE idempotency_key LIKE $1", [`lt-${runId}-%`]);
  } catch {
    /* best-effort cleanup */
  }

  return {
    requested: count,
    blocked,
    soldRecalled: authorized,
    errors,
    retriesHandled: retries,
    durationMs,
    throughputPerSec: durationMs > 0 ? Math.round((count / durationMs) * 1000) : count,
    p50: pct(0.5),
    p95: pct(0.95),
    p99: pct(0.99),
  };
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
