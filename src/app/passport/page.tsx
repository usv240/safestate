"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, AlertTriangle, User, BellRing, Baby } from "lucide-react";
import { apiGet } from "@/lib/client/api";
import { Badge, Card, Container, Eyebrow } from "@/components/ui";
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
    <main>
      <Container className="py-12">
        <Eyebrow>Owner</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg">
          {b("passport.heading")?.title ?? "Safety Passport"}
          <InfoButton topicId="passport.timeline" />
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          {b("passport.explainer")?.body_md ?? ""}
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {products.map((p) => {
            const active = p.directives.filter((d) => covers(p.instance.serial, d));
            const recalled = active.length > 0;
            const owner = p.instance.current_owner_id
              ? `Owner #${p.instance.current_owner_id.slice(-4)}`
              : "Unowned";
            return (
              <Card key={p.instance.id} className="overflow-hidden p-0" interactive>
                <div className={`flex items-center justify-between px-6 py-5 ${recalled ? "bg-red-50/80" : "bg-brand-50/80"}`}>
                  <div className="flex items-center gap-3.5">
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-soft ${recalled ? "bg-red-600" : "bg-brand-600"}`}>
                      {recalled ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                    </span>
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">
                        {p.instance.category} · <span className="font-mono">serial {p.instance.serial}</span>
                      </div>
                      <div className="mt-0.5 font-semibold text-fg">
                        {p.instance.manufacturer_name} {p.instance.model_name}
                      </div>
                    </div>
                  </div>
                  <Badge tone={recalled ? "red" : "brand"}>{recalled ? "RECALLED" : "SAFE"}</Badge>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between rounded-lg bg-surface2 px-3.5 py-2.5 text-sm">
                    <span className="inline-flex items-center gap-2 text-muted">
                      <User className="h-4 w-4" /> Current owner
                    </span>
                    <span className="font-medium text-fg">{owner}</span>
                  </div>

                  {recalled && p.instance.current_owner_id && (
                    <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900 animate-fade-up">
                      <BellRing className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        <b>Safety alert sent to {owner}.</b>
                        {active[0].remedy ? ` Remedy: ${active[0].remedy}` : ""}
                        <span className="mt-1 block text-xs text-amber-700">
                          The manufacturer reached the <i>current</i> owner — not just the original buyer.
                        </span>
                      </span>
                    </div>
                  )}

                  <div className="mt-5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">Safety record</div>
                    {p.directives.length === 0 ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand-700">
                        <ShieldCheck className="h-4 w-4" /> Clear record — no safety directives.
                      </p>
                    ) : (
                      <ol className="mt-3 space-y-3 border-l-2 border-border pl-5">
                        {p.directives.map((d, i) => (
                          <li key={i} className="relative">
                            <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-red-500 shadow-sm" />
                            <div className="text-sm font-medium text-fg">
                              {d.kind}{d.source ? ` · ${d.source}` : ""}
                            </div>
                            {d.hazard && <div className="text-xs text-muted">{d.hazard}</div>}
                            {d.remedy && <div className="text-xs text-muted">Remedy: {d.remedy}</div>}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
          {products.length === 0 && (
            <Card className="flex h-48 items-center justify-center text-muted">
              <Baby className="mr-2 h-5 w-5" /> Loading products…
            </Card>
          )}
        </div>
      </Container>
    </main>
  );
}
