"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  ScanLine,
  ShieldCheck,
  Database,
  ArrowRight,
  Server,
  Radio,
} from "lucide-react";
import { apiGet } from "@/lib/client/api";
import { Badge, Card, Container, Eyebrow, buttonClass } from "@/components/ui";

interface Block { key: string; title: string | null; body_md: string | null }

const STEPS = [
  { icon: Megaphone, title: "A directive is published", body: "A manufacturer (or ingested CPSC data) issues a recall against a model, targeted by serial range, lot, or unit." },
  { icon: Database, title: "The safety guard updates", body: "The model's authoritative safety state and epoch are written in one Aurora DSQL transaction." },
  { icon: ScanLine, title: "Every marketplace checks", body: "At listing and at checkout, the gate reads the live state, strongly consistent from any region." },
  { icon: ShieldCheck, title: "The decision is enforced", body: "Recalled units are blocked at the moment of resale; safe units clear. The owner record follows the product." },
];

export default function HowItWorks() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  useEffect(() => {
    apiGet<{ blocks: Block[] }>("/api/content/tech").then((d) => setBlocks(d.blocks)).catch(() => {});
  }, []);
  const guarantee = blocks.find((b) => b.key === "tech.consistency");

  return (
    <main>
      <Container className="py-12">
        <Eyebrow>How it works</Eyebrow>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          A recall stops being a PDF and becomes a decision.
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          SafeState turns recall status into transaction-time authorization, enforced the moment a
          secondhand product changes hands.
        </p>

        {/* Steps */}
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Card key={i} className="p-6" interactive>
              <div className="flex items-center justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-xs text-muted">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold text-fg">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
            </Card>
          ))}
        </div>

        {/* Architecture */}
        <div className="mt-12">
          <Eyebrow>Architecture</Eyebrow>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-fg">
            One logical, strongly-consistent database, across regions.
          </h2>
          <Card className="mt-5 p-7">
            <ArchitectureDiagram />
          </Card>
        </div>

        {/* Guarantee */}
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-7">
            <Eyebrow>The guarantee</Eyebrow>
            <h2 className="mt-2 text-xl font-semibold text-fg">{guarantee?.title ?? "No stale-safe read, ever."}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              {guarantee?.body_md ??
                "A recall and a sale of the same model write the same guard row, so DSQL's optimistic concurrency control detects the conflict and the loser retries against the new truth."}
            </p>
            <Link href="/live" className={buttonClass("primary", "md", "mt-6")}>
              Run the proof yourself <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
          <Card className="p-7">
            <Eyebrow>The data model</Eyebrow>
            <ul className="mt-3 space-y-2.5 text-sm">
              {[
                ["safety_guard", "one row per model, the conflict point + epoch"],
                ["safety_directives", "recalls / repairs / destroy orders"],
                ["directive_targets", "model · lot · serial-range · unit"],
                ["ownership_transfers", "exact, audited transfers"],
                ["transfer_attempts", "idempotency keys"],
              ].map(([t, d]) => (
                <li key={t} className="flex items-baseline gap-2">
                  <code className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-xs text-fg2">{t}</code>
                  <span className="text-muted">{d}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Container>
    </main>
  );
}

function ArchitectureDiagram() {
  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1.2fr]">
      {/* Vercel */}
      <div className="rounded-2xl border border-border bg-surface2/60 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Server className="h-4 w-4" /> Vercel · Next.js
        </div>
        <div className="mt-3 space-y-2">
          {["Marketplace Gate", "Manufacturer Console", "Safety Passport"].map((s) => (
            <div key={s} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg2">{s}</div>
          ))}
        </div>
        <div className="mt-3 text-center text-xs text-muted">route handlers · IAM token auth</div>
      </div>

      {/* Connector */}
      <div className="flex flex-col items-center justify-center gap-1 text-muted">
        <ArrowRight className="hidden h-5 w-5 lg:block" />
        <span className="font-mono text-[11px]">pg / TLS</span>
      </div>

      {/* DSQL */}
      <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Database className="h-4 w-4 text-brand-700" /> Amazon Aurora DSQL
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Node label="Region A" sub="us-east-1" tone="brand" />
          <Node label="Region B" sub="us-east-2" tone="sky" />
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-surface/60 py-1.5 text-xs text-muted">
          <Radio className="h-3.5 w-3.5" /> Witness · us-west-2 (log-only)
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Badge tone="brand">active-active · strong consistency</Badge>
          <span className="font-mono text-[11px] text-muted">CPSC ingest →</span>
        </div>
      </div>
    </div>
  );
}

function Node({ label, sub, tone }: { label: string; sub: string; tone: "brand" | "sky" }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <Database className={`mx-auto h-4 w-4 ${tone === "brand" ? "text-brand-600" : "text-sky-600"}`} />
      <div className="mt-1 text-xs font-semibold text-fg">{label}</div>
      <div className="font-mono text-[10px] text-muted">{sub}</div>
    </div>
  );
}
