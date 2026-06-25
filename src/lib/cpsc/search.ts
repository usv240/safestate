import { getPool } from "../db/pool";

export interface RecallHit {
  recallNumber: string;
  title: string;
  product: string;
  hazard: string;
  remedy: string;
  recallDate: string;
  url: string;
}

interface RawRecall {
  RecallNumber?: string;
  Title?: string;
  RecallDate?: string;
  URL?: string;
  Products?: { Name?: string }[];
  Hazards?: { Name?: string }[];
  Remedies?: { Name?: string }[];
}

/** Search the full live U.S. CPSC recall database by product name. Covers
 *  every category, not just the nursery snapshot we ingest daily. */
async function liveSearch(query: string, limit: number): Promise<RecallHit[]> {
  const url = `https://www.saferproducts.gov/RestWebServices/Recall?format=json&ProductName=${encodeURIComponent(query)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`CPSC API ${res.status}`);
    const data = (await res.json()) as RawRecall[];
    const seen = new Set<string>();
    const out: RecallHit[] = [];
    for (const r of data) {
      if (!r.RecallNumber || seen.has(r.RecallNumber)) continue;
      seen.add(r.RecallNumber);
      out.push({
        recallNumber: r.RecallNumber,
        title: r.Title ?? "",
        product: r.Products?.[0]?.Name ?? r.Title ?? "",
        hazard: (r.Hazards ?? []).map((h) => h.Name).filter(Boolean).join(" "),
        remedy: (r.Remedies ?? []).map((m) => m.Name).filter(Boolean).join(" "),
        recallDate: (r.RecallDate ?? "").slice(0, 10),
        url: r.URL ?? "",
      });
    }
    out.sort((a, b) => (a.recallDate < b.recallDate ? 1 : -1));
    return out.slice(0, limit);
  } finally {
    clearTimeout(timer);
  }
}

/** Fallback to the recalls we have already ingested, if the live API is slow
 *  or unreachable. */
async function feedSearch(query: string, limit: number): Promise<RecallHit[]> {
  const pool = getPool();
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
  if (!terms.length) return [];
  const patterns = terms.map((t) => `%${t}%`);
  const where = terms.map((_, i) => `(product ILIKE $${i + 1} OR title ILIKE $${i + 1})`).join(" OR ");
  const r = await pool.query(
    `SELECT recall_number, title, product, hazard, remedy, recall_date, url
       FROM cpsc_recalls WHERE ${where} ORDER BY recall_date DESC LIMIT ${limit}`,
    patterns,
  );
  return r.rows.map((x) => ({
    recallNumber: x.recall_number,
    title: x.title,
    product: x.product,
    hazard: x.hazard,
    remedy: x.remedy,
    recallDate: x.recall_date,
    url: x.url,
  }));
}

export async function searchRecalls(
  query: string,
  limit = 8,
): Promise<{ hits: RecallHit[]; source: "live" | "feed" | "none" }> {
  const q = query.trim();
  if (!q) return { hits: [], source: "none" };
  try {
    const live = await liveSearch(q, limit);
    if (live.length) return { hits: live, source: "live" };
  } catch {
    /* fall through to the ingested feed */
  }
  const feed = await feedSearch(q, limit);
  return { hits: feed, source: feed.length ? "feed" : "none" };
}
