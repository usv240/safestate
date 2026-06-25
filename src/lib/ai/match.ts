import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { getPool } from "../db/pool";

export type Decision = "MATCH" | "REVIEW" | "CLEAR";

export interface MatchResult {
  decision: Decision;
  confidence: number;
  recallNumber: string | null;
  recallTitle: string | null;
  reasoning: string;
  mode: "ai" | "heuristic";
}

interface Candidate {
  recall_number: string;
  title: string;
  product: string;
  hazard: string;
}

async function loadCandidates(): Promise<Candidate[]> {
  const pool = getPool();
  const r = await pool.query(
    "SELECT recall_number, title, product, hazard FROM cpsc_recalls ORDER BY recall_date DESC LIMIT 40",
  );
  return r.rows as Candidate[];
}

export function decide(confidence: number): Decision {
  if (confidence >= 0.75) return "MATCH";
  if (confidence >= 0.4) return "REVIEW";
  return "CLEAR";
}

/** Deterministic fallback when no ANTHROPIC_API_KEY is configured. */
function heuristicMatch(text: string, cands: Candidate[]): MatchResult {
  const toks = new Set(
    text.toLowerCase().split(/\W+/).filter((w) => w.length > 3),
  );
  let best: { c: Candidate; score: number } | null = null;
  for (const c of cands) {
    const hay = `${c.product} ${c.hazard}`.toLowerCase().split(/\W+/);
    let overlap = 0;
    for (const w of hay) if (toks.has(w)) overlap += 1;
    const score = overlap / Math.max(6, toks.size);
    if (!best || score > best.score) best = { c, score };
  }
  const confidence = best ? Math.min(0.9, Math.round(best.score * 100) / 100) : 0;
  const matched = best && confidence >= 0.4 ? best.c : null;
  return {
    decision: decide(confidence),
    confidence,
    recallNumber: matched?.recall_number ?? null,
    recallTitle: matched?.product ?? null,
    reasoning: matched
      ? `Keyword overlap with "${matched.title}".`
      : "No meaningful keyword overlap with active recalls.",
    mode: "heuristic",
  };
}

async function aiMatch(text: string, cands: Candidate[], apiKey: string): Promise<MatchResult> {
  const client = new Anthropic({ apiKey });
  const catalog = cands
    .map((c) => `- ${c.recall_number}: ${c.product} — ${(c.hazard || "").slice(0, 100)}`)
    .join("\n");

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      recallNumber: { type: "string", description: "matching recall number, or empty string if none" },
      confidence: { type: "number", description: "0..1" },
      reasoning: { type: "string", description: "one sentence" },
    },
    required: ["recallNumber", "confidence", "reasoning"],
  } as const;

  const msg = await client.messages.create({
    model: process.env.AI_MODEL || "claude-opus-4-8",
    max_tokens: 512,
    output_config: { format: { type: "json_schema", schema } },
    system:
      "You match a messy secondhand product listing to an active CPSC recall, if any. Only match when the listing clearly corresponds to a recalled product (brand/model/category). Be conservative: if unsure, set recallNumber to an empty string and confidence below 0.4. Return confidence in [0,1] and a one-sentence reason.",
    messages: [
      {
        role: "user",
        content: `Listing:\n"""${text}"""\n\nActive recalls:\n${catalog}\n\nWhich recall (if any) does this listing match?`,
      },
    ],
  });

  const block = msg.content.find((b) => b.type === "text");
  const parsed = JSON.parse((block as { text: string }).text) as {
    recallNumber?: string;
    confidence?: number;
    reasoning?: string;
  };
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
  const matched = cands.find((c) => c.recall_number === parsed.recallNumber) ?? null;
  return {
    decision: decide(confidence),
    confidence,
    recallNumber: matched?.recall_number ?? null,
    recallTitle: matched?.product ?? null,
    reasoning: parsed.reasoning || "",
    mode: "ai",
  };
}

async function recordReview(r: MatchResult, text: string) {
  const pool = getPool();
  await pool.query(
    "INSERT INTO match_reviews (id, listing_ref, candidate_directive_id, confidence, state) VALUES ($1,$2,$3,$4,$5)",
    [randomUUID(), text.slice(0, 200), null, r.confidence, r.decision],
  );
}

/** Maps a free-text secondhand listing to an active CPSC recall. Uses Claude
 *  (claude-opus-4-8) when ANTHROPIC_API_KEY is set; otherwise a keyword
 *  heuristic. Records the outcome to the manual-review queue. */
export async function matchListing(text: string): Promise<MatchResult> {
  const cands = await loadCandidates();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  let result: MatchResult;
  if (apiKey) {
    try {
      result = await aiMatch(text, cands, apiKey);
    } catch {
      result = heuristicMatch(text, cands);
    }
  } else {
    result = heuristicMatch(text, cands);
  }

  await recordReview(result, text);
  return result;
}

export async function recentReviews() {
  const pool = getPool();
  const r = await pool.query(
    "SELECT listing_ref, confidence, state, created_at FROM match_reviews ORDER BY created_at DESC LIMIT 8",
  );
  return r.rows as { listing_ref: string; confidence: number; state: string; created_at: string }[];
}
