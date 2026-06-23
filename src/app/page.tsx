"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/client/api";
import { InfoButton } from "@/components/InfoButton";

interface Block {
  key: string;
  title: string | null;
  body_md: string | null;
}
interface ContentResp {
  blocks: Block[];
}
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
    apiGet<ContentResp>("/api/content/home")
      .then((d) => setBlocks(d.blocks))
      .catch(() => {});
    apiGet<Stats>("/api/stats").then(setStats).catch(() => {});
  }, []);

  const b = (k: string) => blocks.find((x) => x.key === k);
  const hero = b("home.hero");
  const how = b("home.how");
  const why = b("home.why");

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">
          Built on Amazon Aurora DSQL
          <InfoButton topicId="dsql.consistency" />
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
          {hero?.title ?? "Recalls, made executable."}
        </h1>
        <p className="mt-4 max-w-2xl whitespace-pre-line text-lg text-slate-600">
          {hero?.body_md ?? ""}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/gate"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            See the Marketplace Gate →
          </Link>
          <Link
            href="/console"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Open the Manufacturer Console
          </Link>
        </div>
      </section>

      {stats && (
        <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Units protected" value={stats.protected_units} />
          <Stat label="Sales blocked" value={stats.blocks_issued} />
          <Stat label="Transfers cleared" value={stats.transfers_completed} />
          <Stat label="Directives issued" value={stats.directives_issued} />
        </section>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Card title={how?.title} body={how?.body_md} />
        <Card title={why?.title} body={why?.body_md} />
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}

function Card({ title, body }: { title?: string | null; body?: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{body}</p>
    </div>
  );
}
