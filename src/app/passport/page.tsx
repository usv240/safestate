"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client/api";
import { InfoButton } from "@/components/InfoButton";

interface Block { key: string; title: string | null; body_md: string | null }
interface Directive {
  kind: string;
  hazard: string | null;
  remedy: string | null;
  source: string | null;
  issued_at: string;
  scope: string;
  range_lo: string | null;
  range_hi: string | null;
}
interface ProductStatus {
  instance: {
    id: string;
    serial: string | null;
    current_owner_id: string | null;
    model_name: string;
    manufacturer_name: string;
    category: string;
  };
  directives: Directive[];
}

function covers(serial: string | null, d: Directive): boolean {
  if (d.scope === "MODEL" || d.scope === "LOT") return true;
  if (serial == null) return false;
  if (d.scope === "UNIT") return d.range_lo != null && serial === d.range_lo;
  if (d.scope === "SERIAL_RANGE" && d.range_lo != null && d.range_hi != null) {
    const ns = Number(serial), lo = Number(d.range_lo), hi = Number(d.range_hi);
    if (![ns, lo, hi].some(Number.isNaN)) return ns >= lo && ns <= hi;
    return serial >= d.range_lo && serial <= d.range_hi;
  }
  return false;
}

export default function PassportPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [products, setProducts] = useState<ProductStatus[]>([]);

  useEffect(() => {
    (async () => {
      const [c, l] = await Promise.all([
        apiGet<{ blocks: Block[] }>("/api/content/passport"),
        apiGet<{ listings: { instanceId: string }[] }>("/api/demo/listings"),
      ]);
      setBlocks(c.blocks);
      const statuses = await Promise.all(
        l.listings.map((x) => apiGet<ProductStatus>(`/api/products/${x.instanceId}`)),
      );
      setProducts(statuses);
    })().catch(() => {});
  }, []);

  const b = (k: string) => blocks.find((x) => x.key === k);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        {b("passport.heading")?.title ?? "Safety Passport"}
        <InfoButton topicId="passport.timeline" />
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        {b("passport.explainer")?.body_md ?? ""}
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {products.map((p) => {
          const active = p.directives.filter((d) => covers(p.instance.serial, d));
          const recalled = active.length > 0;
          const owner = p.instance.current_owner_id
            ? `Owner #${p.instance.current_owner_id.slice(-4)}`
            : "Unowned";
          return (
            <div key={p.instance.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div
                className={`px-5 py-4 ${
                  recalled ? "bg-red-50" : "bg-emerald-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {p.instance.category} · serial {p.instance.serial}
                    </div>
                    <div className="mt-0.5 font-semibold text-slate-900">
                      {p.instance.manufacturer_name} {p.instance.model_name}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      recalled ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
                    }`}
                  >
                    {recalled ? "RECALLED" : "SAFE"}
                  </span>
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Current owner</span>
                  <span className="font-medium text-slate-800">{owner}</span>
                </div>

                {recalled && p.instance.current_owner_id && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <b>Safety alert sent to {owner}.</b>
                    {active[0].remedy ? ` Remedy: ${active[0].remedy}` : ""}
                    <div className="mt-1 text-xs text-amber-700">
                      The manufacturer reached the current owner — not just the original buyer.
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Safety record
                  </div>
                  {p.directives.length === 0 ? (
                    <p className="mt-2 text-sm text-emerald-700">
                      ✓ Clear record — no safety directives on this product.
                    </p>
                  ) : (
                    <ol className="mt-2 space-y-2 border-l-2 border-slate-100 pl-4">
                      {p.directives.map((d, i) => (
                        <li key={i} className="relative">
                          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                          <div className="text-sm font-medium text-slate-800">
                            {d.kind}
                            {d.source ? ` · ${d.source}` : ""}
                          </div>
                          {d.hazard && <div className="text-xs text-slate-600">{d.hazard}</div>}
                          {d.remedy && <div className="text-xs text-slate-500">Remedy: {d.remedy}</div>}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
