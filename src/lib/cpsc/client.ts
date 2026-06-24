export interface CpscRecall {
  recallNumber: string;
  title: string;
  product: string;
  hazard: string;
  remedy: string;
  recallDate: string;
  url: string;
  category: string;
}

const NURSERY_KEYWORDS = [
  "crib", "bassinet", "stroller", "sleeper", "nursery", "infant", "toddler",
  "baby", "car seat", "high chair", "playard", "swaddle", "cradle", "bouncer",
  "changing table", "rocker", "nursing", "pacifier", "booster seat", "child",
];

interface RawRecall {
  RecallNumber?: string;
  Title?: string;
  Description?: string;
  RecallDate?: string;
  URL?: string;
  Products?: { Name?: string }[];
  Hazards?: { Name?: string }[];
  Remedies?: { Name?: string }[];
}

function matchesNursery(r: RawRecall): boolean {
  const hay = [
    r.Title ?? "",
    r.Description ?? "",
    ...(r.Products ?? []).map((p) => p.Name ?? ""),
  ]
    .join(" ")
    .toLowerCase();
  return NURSERY_KEYWORDS.some((k) => hay.includes(k));
}

/** Pulls real recalls from the public CPSC Recall API and keeps the
 *  nursery/juvenile-relevant ones. */
export async function fetchCpscRecalls(opts: { startDate?: string; limit?: number } = {}): Promise<CpscRecall[]> {
  const start = opts.startDate ?? "2023-01-01";
  const limit = opts.limit ?? 24;
  const url = `https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallDateStart=${start}`;

  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`CPSC API ${res.status}`);
  const data = (await res.json()) as RawRecall[];

  const seen = new Set<string>();
  const out: CpscRecall[] = [];
  for (const r of data) {
    if (!r.RecallNumber || seen.has(r.RecallNumber)) continue;
    if (!matchesNursery(r)) continue;
    seen.add(r.RecallNumber);
    out.push({
      recallNumber: r.RecallNumber,
      title: r.Title ?? "",
      product: r.Products?.[0]?.Name ?? "",
      hazard: (r.Hazards ?? []).map((h) => h.Name).filter(Boolean).join(" ") || "",
      remedy: (r.Remedies ?? []).map((m) => m.Name).filter(Boolean).join(" ") || "",
      recallDate: (r.RecallDate ?? "").slice(0, 10),
      url: r.URL ?? "",
      category: "juvenile",
    });
    if (out.length >= limit) break;
  }
  // newest first
  out.sort((a, b) => (a.recallDate < b.recallDate ? 1 : -1));
  return out;
}
