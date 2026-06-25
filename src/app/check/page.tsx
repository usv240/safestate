"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Search, Loader2, Ban, CheckCircle2, ExternalLink } from "lucide-react";
import { apiGet } from "@/lib/client/api";
import { Badge, Button, Card, Container, Eyebrow } from "@/components/ui";
import { InfoHint } from "@/components/InfoHint";

type Agency = "CPSC" | "FDA" | "NHTSA";
interface RecallHit {
  agency: Agency;
  title: string;
  hazard: string;
  remedy?: string;
  date: string;
  url?: string;
  ref: string;
}
interface SearchResp {
  query: string;
  agencies: Agency[];
  count: number;
  hits: RecallHit[];
}

const EXAMPLES = ["space heater", "infant formula", "Honda Civic 2018", "power bank", "valsartan"];

function agencyTone(a: Agency): "sky" | "brand" | "amber" {
  return a === "CPSC" ? "sky" : a === "FDA" ? "brand" : "amber";
}
const AGENCY_LABEL: Record<Agency, string> = {
  CPSC: "CPSC · products",
  FDA: "FDA · food & drugs",
  NHTSA: "NHTSA · vehicles",
};

export default function CheckPage() {
  const [q, setQ] = useState("");
  const [resp, setResp] = useState<SearchResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [checks, setChecks] = useState<number | null>(null);

  async function loadActivity() {
    try {
      const a = await apiGet<{ stats: { check: number; verify: number } }>("/api/activity");
      setChecks(a.stats.check + a.stats.verify);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadActivity();
  }, []);

  async function search(term?: string) {
    const query = (term ?? q).trim();
    if (!query) return;
    if (term) setQ(term);
    setBusy(true);
    setErr(null);
    try {
      const r = await apiGet<SearchResp>(`/api/recall-search?q=${encodeURIComponent(query)}`);
      setResp(r);
      loadActivity();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    search();
  }

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>For everyone</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">Is it recalled?</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Search any product, food, drug, or vehicle you own or are about to buy. SafeState checks the live recall
          databases of the CPSC, FDA, and NHTSA at once, for free. No account needed.
        </p>

        <form onSubmit={onSubmit} className="mx-auto mt-6 flex max-w-xl gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. space heater, infant formula, Honda Civic 2018"
              className="w-full rounded-xl border border-border bg-surface py-3 pl-9 pr-3 text-sm text-fg outline-none placeholder:text-muted/70 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <Button type="submit" disabled={busy || !q.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
          </Button>
          <span className="flex items-center">
            <InfoHint text="Searches the live CPSC, FDA, and NHTSA recall databases at once. Vehicle queries like “Honda Civic 2018” route to NHTSA." />
          </span>
        </form>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => search(x)}
              className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg2 transition-colors hover:bg-surface2 hover:text-fg"
            >
              {x}
            </button>
          ))}
        </div>
        {err && <p className="mt-4 text-sm text-red-700">{err}</p>}
        {checks != null && checks > 0 && (
          <p className="mt-4 text-xs text-muted">
            <span className="font-semibold text-fg tabular-nums">{checks.toLocaleString()}</span> recall checks run on SafeState
          </p>
        )}
      </div>

      {resp && (
        <div className="mx-auto mt-10 max-w-3xl">
          {resp.count > 0 ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone="red"><Ban className="h-3.5 w-3.5" /> {resp.count} recall{resp.count > 1 ? "s" : ""} found</Badge>
                <span className="text-muted">for &ldquo;{resp.query}&rdquo; across {resp.agencies.join(", ")}</span>
              </div>
              <div className="mt-4 space-y-3">
                {resp.hits.map((h, i) => (
                  <Card key={`${h.ref}-${i}`} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-fg">{h.title}</h3>
                      <Badge tone={agencyTone(h.agency)} className="shrink-0">{AGENCY_LABEL[h.agency]}</Badge>
                    </div>
                    {h.hazard && (
                      <p className="mt-2 text-sm text-fg2"><span className="font-medium text-red-700">Reason:</span> {h.hazard}</p>
                    )}
                    {h.remedy && (
                      <p className="mt-1 text-sm text-fg2"><span className="font-medium">Remedy:</span> {h.remedy}</p>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted">
                      {h.date && <span>{h.date}</span>}
                      {h.url && (
                        <a
                          href={h.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-brand-700 hover:text-brand-800"
                        >
                          Official notice <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
              <p className="mt-5 text-center text-xs text-muted">
                Searched the live CPSC, FDA, and NHTSA recall databases. A recall can be issued at any time, so always
                confirm with the agency.
              </p>
            </>
          ) : (
            <Card className="p-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-brand-600" />
              <h3 className="mt-3 text-lg font-semibold text-fg">No recall found for &ldquo;{resp.query}&rdquo;</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Good news, nothing matched across CPSC, FDA, or NHTSA. This is a search, not a guarantee. For vehicles,
                try &ldquo;make model year&rdquo; (for example, Honda Civic 2018). When unsure, confirm at{" "}
                <a href="https://www.recalls.gov" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">
                  Recalls.gov
                </a>.
              </p>
            </Card>
          )}
        </div>
      )}
    </Container>
  );
}
