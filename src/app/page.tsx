"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Ban,
  CheckCircle2,
  Megaphone,
  ArrowRight,
  Radio,
  ScanLine,
  Building2,
} from "lucide-react";
import { apiGet } from "@/lib/client/api";
import { Badge, buttonClass, Card, Container, Eyebrow } from "@/components/ui";
import { InfoButton } from "@/components/InfoButton";

interface Block { key: string; title: string | null; body_md: string | null }
interface Stats {
  protected_units: string;
  blocks_issued: string;
  transfers_completed: string;
  directives_issued: string;
}

export default function Home() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiGet<{ blocks: Block[] }>("/api/content/home").then((d) => setBlocks(d.blocks)).catch(() => {});
    apiGet<Stats>("/api/stats").then(setStats).catch(() => {});
  }, []);

  const b = (k: string) => blocks.find((x) => x.key === k);
  const hero = b("home.hero");
  const how = b("home.how");
  const why = b("home.why");

  return (
    <main>
      {/* Hero */}
      <Container className="pt-16 pb-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <Badge tone="brand">
              <ShieldCheck className="h-3.5 w-3.5" /> Built on Amazon Aurora DSQL
              <InfoButton topicId="dsql.consistency" />
            </Badge>
            <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight text-fg sm:text-6xl">
              {hero?.title ?? "Recalls, made executable."}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              {hero?.body_md ??
                "A recall is just information until something acts on it."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/gate" className={buttonClass("primary", "lg")}>
                See the Marketplace Gate <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/console" className={buttonClass("secondary", "lg")}>
                Open the Console
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Radio className="h-4 w-4 text-brand-600" /> Multi-region active-active
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-brand-600" /> Strong consistency
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ScanLine className="h-4 w-4 text-brand-600" /> Real CPSC data
              </span>
            </div>
          </div>

          <HeroVisual />
        </div>
      </Container>

      {/* Stats */}
      <Container className="py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat icon={<ShieldCheck className="h-5 w-5" />} label="Units protected" value={stats?.protected_units} tone="brand" />
          <Stat icon={<Ban className="h-5 w-5" />} label="Sales blocked" value={stats?.blocks_issued} tone="red" />
          <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Transfers cleared" value={stats?.transfers_completed} tone="brand" />
          <Stat icon={<Megaphone className="h-5 w-5" />} label="Directives issued" value={stats?.directives_issued} tone="sky" />
        </div>
      </Container>

      {/* Universal check — for everyone */}
      <Container className="py-8">
        <Card className="flex flex-col items-center gap-5 p-8 text-center sm:flex-row sm:justify-between sm:text-left" interactive>
          <div>
            <Eyebrow>For everyone</Eyebrow>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-fg">Is something in your home recalled?</h2>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">
              Check any product, food, drug, or vehicle against the live CPSC, FDA, and NHTSA recall databases at once. Free, no account.
            </p>
          </div>
          <Link href="/check" className={buttonClass("primary", "lg", "shrink-0")}>
            Check any product <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </Container>

      {/* How / Why */}
      <Container className="py-8">
        <div className="grid gap-5 md:grid-cols-3">
          <Card className="p-7 md:col-span-2">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-2 text-xl font-semibold text-fg">{how?.title}</h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-muted">
              {how?.body_md}
            </p>
          </Card>
          <Card className="flex flex-col justify-between p-7" interactive>
            <div>
              <Eyebrow>Why it matters</Eyebrow>
              <h2 className="mt-2 text-xl font-semibold text-fg">{why?.title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{why?.body_md}</p>
            </div>
            <Link href="/live" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:gap-2.5 transition-all">
              See the consistency proof <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </div>
      </Container>

      {/* Personas */}
      <Container className="py-8 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Persona icon={<ShieldCheck className="h-5 w-5" />} title="Anyone" body="Check any product for a recall, then share a verdict that travels with the item." href="/verify" cta="Safe Handoff" />
          <Persona icon={<Building2 className="h-5 w-5" />} title="Marketplaces" body="Check safety at listing and checkout. Block recalled units automatically." href="/gate" cta="Marketplace Gate" />
          <Persona icon={<Megaphone className="h-5 w-5" />} title="Manufacturers" body="Issue precise recalls by serial range and reach current owners." href="/console" cta="Manufacturer Console" />
          <Persona icon={<ScanLine className="h-5 w-5" />} title="Owners" body="A safety passport that follows the product through every resale." href="/passport" cta="Safety Passport" />
        </div>
      </Container>
    </main>
  );
}

function HeroVisual() {
  return (
    <div className="relative animate-fade-up [animation-delay:120ms]">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-100/60 via-transparent to-sky-100/50 blur-2xl" />
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-fg2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            Checkout · DreamNest Bassinet
          </div>
          <span className="font-mono text-xs text-muted">serial 100</span>
        </div>
        <div className="space-y-4 p-6">
          <div className="animate-stamp rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white">
                <Ban className="h-5 w-5" />
              </span>
              <div>
                <div className="text-base font-bold text-red-800">BLOCKED — Unsafe for resale</div>
                <div className="text-sm text-muted">Active recall · source CPSC</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {["Hazard", "Remedy", "Source"].map((k) => (
              <div key={k} className="rounded-lg border border-border bg-surface2/60 p-2.5">
                <div className="font-semibold uppercase tracking-wide text-muted">{k}</div>
                <div className="mt-1 text-fg2">
                  {k === "Hazard" ? "Side rail detaches" : k === "Remedy" ? "Full refund" : "CPSC"}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-xl bg-ink-900 px-4 py-3 text-sm text-white">
            <span className="inline-flex items-center gap-2">
              <Radio className="h-4 w-4 text-brand-400" /> us-east-1 ⇄ us-east-2
            </span>
            <span className="font-mono text-xs text-white/70">strongly consistent</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | undefined;
  tone: "brand" | "red" | "sky";
}) {
  const toneCls = { brand: "text-brand-600 bg-brand-50", red: "text-red-600 bg-red-50", sky: "text-sky-600 bg-sky-50" }[tone];
  return (
    <Card className="p-5" interactive>
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${toneCls}`}>{icon}</span>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-fg tabular-nums">
        {value ?? "—"}
      </div>
      <div className="mt-0.5 text-sm text-muted">{label}</div>
    </Card>
  );
}

function Persona({
  icon,
  title,
  body,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Card className="flex flex-col p-6" interactive>
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface2 text-fg2">
        {icon}
      </span>
      <h3 className="mt-4 font-semibold text-fg">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{body}</p>
      <Link href={href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-all hover:gap-2.5">
        {cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}
