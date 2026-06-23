import { getPool } from "./pool";

export interface DirectiveView {
  kind: string;
  hazard: string | null;
  remedy: string | null;
  source: string | null;
  issued_at: string;
  scope: string;
  range_lo: string | null;
  range_hi: string | null;
}

export interface ProductStatus {
  instance: {
    id: string;
    serial: string | null;
    status: string;
    current_owner_id: string | null;
    model_id: string;
    model_name: string;
    category: string;
    manufacturer_name: string;
    guard_status: string;
    epoch: string;
  };
  directives: DirectiveView[];
}

export async function getProductStatus(instanceId: string): Promise<ProductStatus | null> {
  const pool = getPool();
  const inst = await pool.query(
    `SELECT pi.id, pi.serial, pi.status, pi.current_owner_id,
            pm.id   AS model_id, pm.name AS model_name, pm.category,
            m.name  AS manufacturer_name,
            g.status AS guard_status, g.epoch
       FROM product_instances pi
       JOIN product_models pm ON pm.id = pi.model_id
       JOIN manufacturers   m ON m.id  = pm.manufacturer_id
       JOIN safety_guard    g ON g.model_id = pm.id
      WHERE pi.id = $1`,
    [instanceId],
  );
  if (!inst.rowCount) return null;

  const dir = await pool.query<DirectiveView>(
    `SELECT d.kind, d.hazard, d.remedy, d.source, d.issued_at,
            t.scope, t.range_lo, t.range_hi
       FROM safety_directives d
       JOIN directive_targets t ON t.directive_id = d.id
      WHERE d.model_id = $1
      ORDER BY d.issued_at DESC`,
    [inst.rows[0].model_id],
  );
  return { instance: inst.rows[0], directives: dir.rows };
}

export async function getContent(surface: string) {
  const pool = getPool();
  const r = await pool.query(
    "SELECT key, title, body_md FROM content_blocks WHERE surface = $1 ORDER BY key",
    [surface],
  );
  return r.rows as { key: string; title: string | null; body_md: string | null }[];
}

export async function getHelp(topicId: string) {
  const pool = getPool();
  const r = await pool.query(
    "SELECT topic_id, title, body_md, learn_more_url FROM help_topics WHERE topic_id = $1",
    [topicId],
  );
  return (r.rows[0] ?? null) as
    | { topic_id: string; title: string; body_md: string; learn_more_url: string | null }
    | null;
}

export async function getTutorial(surface: string) {
  const pool = getPool();
  const r = await pool.query(
    "SELECT step_order, anchor, title, body_md FROM tutorial_steps WHERE surface = $1 ORDER BY step_order",
    [surface],
  );
  return r.rows as { step_order: number; anchor: string | null; title: string; body_md: string }[];
}

/** Live counts — never fabricated. */
export async function getStats() {
  const pool = getPool();
  const r = await pool.query(`
    SELECT
      (SELECT count(*) FROM product_instances)                          AS protected_units,
      (SELECT count(*) FROM transfer_attempts WHERE decision='BLOCKED') AS blocks_issued,
      (SELECT count(*) FROM ownership_transfers)                        AS transfers_completed,
      (SELECT count(*) FROM safety_directives)                          AS directives_issued
  `);
  return r.rows[0] as Record<string, string>;
}
