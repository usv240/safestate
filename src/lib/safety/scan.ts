import { getPool } from "../db/pool";
import { serialCovered } from "./authorizeTransfer";

/** One row of a marketplace's catalog: a product model and (optionally) the
 *  unit's serial and the marketplace's own SKU. */
export interface ScanItem {
  model: string;
  serial?: string | null;
  sku?: string | null;
}

export type ScanStatus = "BLOCKED" | "CLEAR" | "UNKNOWN";

export interface ScanRow {
  model: string;
  serial: string | null;
  sku: string | null;
  status: ScanStatus;
  hazard?: string;
  remedy?: string;
  source?: string;
  kind?: string;
}

export interface ScanReport {
  summary: { total: number; blocked: number; clear: number; unknown: number };
  results: ScanRow[];
}

interface DirRow {
  model_id: string;
  id: string;
  kind: string;
  hazard: string | null;
  remedy: string | null;
  source: string | null;
  scope: string;
  range_lo: string | null;
  range_hi: string | null;
}

/**
 * Evaluate a whole catalog against live SafeState safety state in two queries,
 * then decide each row in memory. A row is BLOCKED if any active directive on
 * its model covers its serial (same serial-aware logic the single-unit gate
 * uses), CLEAR if the model is known but no directive covers it, and UNKNOWN
 * if the model is not in the registry.
 */
export async function scanCatalog(items: ScanItem[]): Promise<ScanReport> {
  const pool = getPool();

  const key = (s: string) => s.trim().toLowerCase();
  const names = Array.from(new Set(items.map((i) => key(i.model)).filter(Boolean)));

  // 1) Resolve model names to model ids.
  const modelByName = new Map<string, string>();
  if (names.length) {
    const m = await pool.query<{ id: string; name: string }>(
      "SELECT id, name FROM product_models WHERE lower(name) = ANY($1)",
      [names],
    );
    for (const r of m.rows) modelByName.set(key(r.name), r.id);
  }

  // 2) Load every active directive for the matched models, grouped by model.
  const dirByModel = new Map<string, DirRow[]>();
  const modelIds = Array.from(new Set(modelByName.values()));
  if (modelIds.length) {
    const d = await pool.query<DirRow>(
      `SELECT d.model_id, d.id, d.kind, d.hazard, d.remedy, d.source, t.scope, t.range_lo, t.range_hi
         FROM safety_directives d
         JOIN directive_targets t ON t.directive_id = d.id
        WHERE d.model_id = ANY($1)
        ORDER BY d.issued_at DESC`,
      [modelIds],
    );
    for (const r of d.rows) {
      const list = dirByModel.get(r.model_id) ?? [];
      list.push(r);
      dirByModel.set(r.model_id, list);
    }
  }

  // 3) Decide each row.
  let blocked = 0, clear = 0, unknown = 0;
  const results: ScanRow[] = items.map((i) => {
    const serial = i.serial != null && String(i.serial).trim() !== "" ? String(i.serial).trim() : null;
    const sku = i.sku ?? null;
    const modelId = modelByName.get(key(i.model));

    if (!modelId) {
      unknown++;
      return { model: i.model, serial, sku, status: "UNKNOWN" };
    }
    const hit = (dirByModel.get(modelId) ?? []).find((row) => serialCovered(serial, row));
    if (hit) {
      blocked++;
      return {
        model: i.model, serial, sku, status: "BLOCKED",
        hazard: hit.hazard ?? undefined,
        remedy: hit.remedy ?? undefined,
        source: hit.source ?? undefined,
        kind: hit.kind,
      };
    }
    clear++;
    return { model: i.model, serial, sku, status: "CLEAR" };
  });

  return { summary: { total: items.length, blocked, clear, unknown }, results };
}
