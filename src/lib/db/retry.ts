import type { PoolClient } from "pg";
import { getPool } from "./pool";

/**
 * Aurora DSQL uses optimistic concurrency control under snapshot isolation.
 * On a write-write conflict the losing COMMIT fails with a retryable error:
 *   - 40001  PostgreSQL serialization failure (the umbrella code)
 *   - OC000  same-row write-write conflict  ← our guard-row race fires this
 *   - OC001  stale cached schema (DDL) conflict
 * All are safe to retry. We retry the WHOLE transaction with exponential
 * backoff + jitter, which is also correct against local Postgres.
 */
const RETRYABLE_CODES = new Set(["40001", "OC000", "OC001"]);

export interface TxnOutcome<T> {
  value: T;
  attempts: number;
}

export async function withTxnRetry<T>(
  fn: (client: PoolClient) => Promise<T>,
  opts: { maxAttempts?: number } = {},
): Promise<TxnOutcome<T>> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const pool = getPool();
  let attempt = 0;

  for (;;) {
    attempt += 1;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const value = await fn(client);
      await client.query("COMMIT");
      return { value, attempts: attempt };
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* connection may be gone; ignore */
      }
      const code = (err as { code?: string })?.code ?? "";
      if (RETRYABLE_CODES.has(code) && attempt < maxAttempts) {
        const backoffMs = Math.min(2 ** attempt * 25, 500) + Math.random() * 50;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      throw err;
    } finally {
      client.release();
    }
  }
}

export function isRetryableConflict(err: unknown): boolean {
  const code = (err as { code?: string })?.code ?? "";
  return RETRYABLE_CODES.has(code);
}
