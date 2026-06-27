"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, Search, Bot, Cpu } from "lucide-react";
import { apiGet, apiPost } from "@/lib/client/api";
import { Badge, Button, Card, Container, Eyebrow } from "@/components/ui";
import { InfoButton } from "@/components/InfoButton";

interface MatchResult {
  decision: "MATCH" | "REVIEW" | "CLEAR";
  confidence: number;
  recallNumber: string | null;
  recallTitle: string | null;
  reasoning: string;
  mode: "ai" | "heuristic";
}
interface Review { listing_ref: string; confidence: number; state: string; created_at: string }

const EXAMPLES = [
  "Used baby bassinet, sleeps great, the side mesh rail folds down, DreamNest style, serial around 100.",
  "Vintage wooden toddler bookshelf, solid oak, no issues, picked up from a yard sale.",
  "Infant rocker / sleeper, gently used, works with batteries.",
];

export default function MatchPage() {
  const [text, setText] = useState(EXAMPLES[0]);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  const loadReviews = useCallback(async () => {
    apiGet<{ reviews: Review[] }>("/api/match").then((d) => setReviews(d.reviews)).catch(() => {});
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      setResult(await apiPost<MatchResult>("/api/match", { text }));
      await loadReviews();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <Container className="py-12">
        <Eyebrow>AI</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg">
          Match Assistant
          <InfoButton topicId="match.assistant" />
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Secondhand listings are messy free text and CPSC model data is incomplete. The assistant
          maps a listing to a real recall, scores its confidence, and routes uncertain matches to a
          human review queue.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-7">
            <label className="text-sm font-medium text-fg2">Paste a marketplace listing</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-border bg-surface p-3 text-sm text-fg outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setText(ex)}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg2 hover:border-border"
                >
                  Example {i + 1}
                </button>
              ))}
            </div>
            <Button className="mt-5" onClick={run} disabled={busy || text.trim().length < 3}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><Search className="h-4 w-4" /> Check this listing</>}
            </Button>

            {result && <ResultCard r={result} />}
          </Card>

          <Card className="p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-fg">Review queue</h2>
              <Badge tone="slate">latest</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">Every check is logged for compliance.</p>
            {reviews.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                No checks yet.
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {reviews.map((rv, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
                    <span className="truncate text-sm text-fg2">{rv.listing_ref}</span>
                    <StateBadge state={rv.state} confidence={rv.confidence} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </Container>
    </main>
  );
}

function ResultCard({ r }: { r: MatchResult }) {
  const tone =
    r.decision === "MATCH" ? "red" : r.decision === "REVIEW" ? "amber" : "brand";
  const label =
    r.decision === "MATCH" ? "Recall match, block listing" : r.decision === "REVIEW" ? "Uncertain, route to review" : "No recall match";
  const Icon = r.decision === "CLEAR" ? CheckCircle2 : AlertTriangle;
  const bg = { red: "border-red-200 bg-red-50/70", amber: "border-amber-200 bg-amber-50/70", brand: "border-brand-200 bg-brand-50/70" }[tone];
  const fg = { red: "text-red-800", amber: "text-amber-800", brand: "text-brand-800" }[tone];

  return (
    <div className={`mt-5 rounded-xl2 border p-5 animate-fade-up ${bg}`}>
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 font-semibold ${fg}`}>
          <Icon className="h-5 w-5" /> {label}
        </div>
        <Badge tone={r.mode === "ai" ? "sky" : "slate"}>
          {r.mode === "ai" ? <><Bot className="h-3.5 w-3.5" /> Claude</> : <><Cpu className="h-3.5 w-3.5" /> heuristic</>}
        </Badge>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>confidence</span>
          <span className="font-mono">{Math.round(r.confidence * 100)}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
          <div
            className={`h-full rounded-full ${tone === "red" ? "bg-red-500" : tone === "amber" ? "bg-amber-500" : "bg-brand-500"}`}
            style={{ width: `${Math.round(r.confidence * 100)}%` }}
          />
        </div>
      </div>

      {r.recallTitle && (
        <p className="mt-3 text-sm text-fg2">
          <span className="font-medium">Closest recall:</span> {r.recallTitle}{" "}
          <span className="font-mono text-xs text-muted">#{r.recallNumber}</span>
        </p>
      )}
      <p className="mt-2 flex items-start gap-1.5 text-sm text-fg2">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> {r.reasoning}
      </p>
    </div>
  );
}

function StateBadge({ state, confidence }: { state: string; confidence: number }) {
  const tone = state === "MATCH" ? "red" : state === "REVIEW" ? "amber" : "brand";
  return <Badge tone={tone}>{state} · {Math.round(confidence * 100)}%</Badge>;
}
