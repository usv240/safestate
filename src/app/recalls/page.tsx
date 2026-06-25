"use client";

import { useEffect, useState } from "react";
import { ExternalLink, RadioTower, ShieldAlert } from "lucide-react";
import { apiGet } from "@/lib/client/api";
import { Badge, Card, Container, Eyebrow } from "@/components/ui";

interface Recall {
  recall_number: string;
  title: string;
  product: string;
  hazard: string;
  remedy: string;
  recall_date: string;
  url: string;
}
interface Resp {
  recalls: Recall[];
  lastIngest: { count: number; ran_at: string } | null;
}

export default function RecallsPage() {
  const [data, setData] = useState<Resp | null>(null);

  useEffect(() => {
    apiGet<Resp>("/api/recalls").then(setData).catch(() => {});
  }, []);

  const updated = data?.lastIngest?.ran_at
    ? new Date(data.lastIngest.ran_at).toLocaleString()
    : null;

  return (
    <main>
      <Container className="py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>Live feed</Eyebrow>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg">
              Real CPSC recalls
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
              Nursery and juvenile-product recalls pulled from the public CPSC Recall API by a daily
              Vercel Cron job. The demo runs off a frozen snapshot — this is the live source.
            </p>
          </div>
          <Badge tone="brand">
            <RadioTower className="h-3.5 w-3.5" /> Live from CPSC
          </Badge>
        </div>

        {data && (
          <p className="mt-4 text-sm text-muted">
            {data.recalls.length} recalls{updated ? ` · last ingested ${updated}` : ""}
          </p>
        )}

        <div className="mt-6 grid gap-4">
          {data?.recalls.map((r) => (
            <Card key={r.recall_number} className="p-6" interactive>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <ShieldAlert className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h3 className="font-semibold leading-snug text-fg">
                      {r.product || "Recalled product"}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted">CPSC recall #{r.recall_number}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-xs text-muted">{r.recall_date}</span>
                  <Badge tone="slate">#{r.recall_number}</Badge>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {r.hazard && (
                  <div className="rounded-lg bg-red-50/60 px-3 py-2 text-sm">
                    <span className="font-semibold text-red-800">Hazard. </span>
                    <span className="text-fg2">{r.hazard}</span>
                  </div>
                )}
                {r.remedy && (
                  <div className="rounded-lg bg-surface2 px-3 py-2 text-sm">
                    <span className="font-semibold text-fg">Remedy. </span>
                    <span className="text-fg2">{r.remedy}</span>
                  </div>
                )}
              </div>

              {r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:gap-2.5 transition-all"
                >
                  View on CPSC.gov <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </Card>
          ))}
          {!data && (
            <Card className="flex h-40 items-center justify-center text-muted">Loading live recalls…</Card>
          )}
        </div>
      </Container>
    </main>
  );
}
