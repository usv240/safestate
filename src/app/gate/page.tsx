"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/client/api";
import { InfoButton } from "@/components/InfoButton";

interface Block { key: string; title: string | null; body_md: string | null }
interface Directive { kind: string; hazard: string | null; remedy: string | null; source: string | null }
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
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {b("gate.heading")?.title ?? "Marketplace Safety Gate"}
            <InfoButton topicId="gate.checkout" />
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            {b("gate.explainer")?.body_md ?? ""}
          </p>
        </div>
        <button
          onClick={reset}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Reset demo
        </button>
      </div>

      {verdict && <VerdictBanner v={verdict} />}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {listings.map((l) => {
          const recalled = l.guardStatus !== "SAFE";
          return (
            <div key={l.instanceId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex h-32 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                {l.category}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{l.title}</h3>
                  <span className="text-sm font-semibold text-slate-900">{l.priceLabel}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {l.condition} · serial {l.serial}
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      recalled
                        ? "bg-red-50 text-red-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {recalled ? `● ${l.guardStatus}` : "● model status: SAFE"}
                  </span>
                </div>
                <button
                  onClick={() => buy(l)}
                  disabled={busy === l.instanceId}
                  className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {busy === l.instanceId ? "Checking safety…" : "Buy now"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function VerdictBanner({ v }: { v: Verdict & { title: string } }) {
  const blocked = v.decision === "BLOCKED";
  return (
    <div
      className={`mt-6 rounded-2xl border p-5 ${
        blocked ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-white ${
            blocked ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {blocked ? "✕" : "✓"}
        </span>
        <div>
          <div className={`text-lg font-bold ${blocked ? "text-red-800" : "text-emerald-800"}`}>
            {blocked ? "BLOCKED — Unsafe for resale" : "AUTHORIZED — Safe to transfer"}
          </div>
          <div className="text-sm text-slate-600">{v.title}</div>
        </div>
      </div>
      {blocked && (v.reason || v.remedy || v.source) && (
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          {v.reason && <Field label="Hazard" value={v.reason} />}
          {v.remedy && <Field label="Remedy" value={v.remedy} />}
          {v.source && <Field label="Source" value={v.source} />}
        </dl>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Decision committed via Aurora DSQL · transaction attempts: {v.attempts}
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value}</dd>
    </div>
  );
}
