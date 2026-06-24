import { randomUUID } from "node:crypto";
import { withTxnRetry } from "../db/retry";
import { getPool } from "../db/pool";
import { fetchCpscRecalls } from "./client";

/** Full-refresh ingest of the nursery-relevant CPSC recall feed. */
export async function ingestCpsc(limit = 24): Promise<{ count: number }> {
  const recalls = await fetchCpscRecalls({ limit });

  await withTxnRetry(async (client) => {
    await client.query("DELETE FROM cpsc_recalls");
    for (const r of recalls) {
      await client.query(
        `INSERT INTO cpsc_recalls (recall_number, title, product, hazard, remedy, recall_date, url, category)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [r.recallNumber, r.title, r.product, r.hazard, r.remedy, r.recallDate, r.url, r.category],
      );
    }
    await client.query("INSERT INTO ingest_runs (id, source, count) VALUES ($1,'CPSC',$2)", [
      randomUUID(),
      recalls.length,
    ]);
  });

  return { count: recalls.length };
}

export async function getCpscRecalls() {
  const pool = getPool();
  const r = await pool.query(
    "SELECT recall_number, title, product, hazard, remedy, recall_date, url FROM cpsc_recalls ORDER BY recall_date DESC",
  );
  return r.rows as {
    recall_number: string;
    title: string;
    product: string;
    hazard: string;
    remedy: string;
    recall_date: string;
    url: string;
  }[];
}

export async function getLastIngest() {
  const pool = getPool();
  const r = await pool.query(
    "SELECT source, count, ran_at FROM ingest_runs ORDER BY ran_at DESC LIMIT 1",
  );
  return (r.rows[0] ?? null) as { source: string; count: number; ran_at: string } | null;
}
