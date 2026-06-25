"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, CheckCircle2, RotateCcw, Baby, Loader2, AlertTriangle } from "lucide-react";
import { apiGet, apiPost } from "@/lib/client/api";
import { Badge, Button, Card, Container, Eyebrow } from "@/components/ui";
import { InfoButton } from "@/components/InfoButton";
import { InfoHint } from "@/components/InfoHint";
import { GuidedTour } from "@/components/GuidedTour";

interface Block { key: string; title: string | null; body_md: string | null }
interface Directive { kind: string; hazard: string | null; remedy: string | null; source: string | null; scope?: string; range_lo?: string | null; range_hi?: string | null }
interface Listing {
  instanceId: string;
  title: string;
  category: string;
  serial: string | null;
  guardStatus: string;
  priceLabel: string;
  condition: string;
  directives: Directive[];
}
interface ListingsResp { buyerId: string; listings: Listing[] }
interface Verdict {
  decision: "AUTHORIZED" | "BLOCKED";
  reason?: string;
  remedy?: string;
  source?: string;
  attempts: number;
}

export default function GatePage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [buyerId, setBuyerId] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [verdict, setVerdict] = useState<(Verdict & { title: string }) | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [c, l] = await Promise.all([
      apiGet<{ blocks: Block[] }>("/api/content/gate"),
      apiGet<ListingsResp>("/api/demo/listings"),
    ]);
    setBlocks(c.blocks);
    setBuyerId(l.buyerId);
    setListings(l.listings);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const b = (k: string) => blocks.find((x) => x.key === k);

  const recallRange = (() => {
    for (const l of listings) {
      const d = l.directives.find((x) => x.scope === "SERIAL_RANGE" && x.range_lo && x.range_hi);
      if (d) return { lo: d.range_lo as string, hi: d.range_hi as string };
    }
    return null;
  })();

  async function buy(listing: Listing) {
    if (!buyerId) return;
    setBusy(listing.instanceId);
    setVerdict(null);
    try {
      const res = await apiPost<Verdict>("/api/authorize-transfer", {
        instanceId: listing.instanceId,
        toOwnerId: buyerId,
        idempotencyKey: crypto.randomUUID(),
      });
      setVerdict({ ...res, title: listing.title });
      await load();
    } catch (e) {
      setVerdict({ decision: "BLOCKED", reason: (e as Error).message, attempts: 0, title: listing.title });
    } finally {
      setBusy(null);
    }
  }

  async function reset() {
    setVerdict(null);
    await apiPost("/api/demo/seed", {});
    await load();
  }

  return (
    <main>
      <GuidedTour surface="gate" />
      <Container className="py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <Eyebrow>Marketplace</Eyebrow>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg">
              {b("gate.heading")?.title ?? "Marketplace Safety Gate"}
              <InfoButton topicId="gate.checkout" />
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              {b("gate.explainer")?.body_md ?? ""}
            </p>
          </div>
          <span className="inline-flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Reset demo
            </Button>
            <InfoHint text="Restores the demo to its known-good state: the canonical recall re-issued and both units back in place. Safe to click anytime." />
          </span>
        </div>

        {recallRange && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Active recall covers serials <b>{recallRange.lo}&ndash;{recallRange.hi}</b>. Units in this range are
              blocked at checkout; units outside it still sell. Try buying both below.
            </span>
          </div>
        )}

        {verdict && <VerdictBanner v={verdict} />}

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {listings.map((l) => {
            const recalled = l.guardStatus !== "SAFE";
            return (
              <Card key={l.instanceId} className="overflow-hidden p-0" interactive>
                <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-surface2 to-border/70">
                  <Baby className="h-12 w-12 text-muted" strokeWidth={1.25} />
                  <span className="absolute right-3 top-3">
                    <Badge tone={recalled ? "red" : "brand"}>
                      <span className={`h-1.5 w-1.5 rounded-full ${recalled ? "bg-red-500" : "bg-brand-500"}`} />
                      {recalled ? l.guardStatus : "model: SAFE"}
                    </Badge>
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-fg">{l.title}</h3>
                    <span className="shrink-0 text-lg font-semibold text-fg">{l.priceLabel}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {l.condition} · <span className="font-mono text-xs">serial {l.serial}</span>
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      className="flex-1"
                      variant={recalled ? "secondary" : "primary"}
                      onClick={() => buy(l)}
                      disabled={busy === l.instanceId}
                    >
                      {busy === l.instanceId ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Checking safety…</>
                      ) : (
                        "Buy now"
                      )}
                    </Button>
                    <InfoHint text="Calls authorize-transfer: one Aurora DSQL transaction that checks this exact serial against active recalls and records the decision. Blocked if recalled, authorized if not." />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </main>
  );
}

function VerdictBanner({ v }: { v: Verdict & { title: string } }) {
  const blocked = v.decision === "BLOCKED";
  return (
    <div
      key={v.title + v.decision + v.attempts}
      className={`mt-8 animate-stamp overflow-hidden rounded-xl2 border shadow-soft ${
        blocked ? "border-red-200 bg-red-50/70" : "border-brand-200 bg-brand-50/70"
      }`}
    >
      <div className="flex items-center gap-4 p-6">
        <span
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-soft ${
            blocked ? "bg-red-600" : "bg-brand-600"
          }`}
        >
          {blocked ? <Ban className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
        </span>
        <div>
          <div className={`text-xl font-bold ${blocked ? "text-red-800" : "text-brand-800"}`}>
            {blocked ? "BLOCKED — Unsafe for resale" : "AUTHORIZED — Safe to transfer"}
          </div>
          <div className="text-sm text-muted">{v.title}</div>
        </div>
      </div>
      {blocked && (v.reason || v.remedy || v.source) && (
        <div className="grid gap-px bg-red-100 sm:grid-cols-3">
          {v.reason && <Field label="Hazard" value={v.reason} />}
          {v.remedy && <Field label="Remedy" value={v.remedy} />}
          {v.source && <Field label="Source" value={v.source} />}
        </div>
      )}
      <div className="border-t border-border/60 bg-surface/60 px-6 py-2.5 text-xs text-muted">
        Decision committed via Aurora DSQL · transaction attempts: {v.attempts}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface/80 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-sm text-fg">{value}</div>
    </div>
  );
}
