"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/client/api";
import { InfoButton } from "@/components/InfoButton";

interface RegionInfo {
  regionA: string;
  regionB: string | null;
  multiRegion: boolean;
  witnessRegion: string | null;
}
interface CrossRegion {
  regionA: string;
  regionB: string;
  multiRegion: boolean;
  before: { status: string; epoch: number };
  after: { status: string; epoch: number };
  epoch: number;
  instant: boolean;
}
interface Conflict {
  winner: string;
  loser: { code: string | null; subCode: string | null; message: string } | null;
}

export default function LivePage() {
  const [info, setInfo] = useState<RegionInfo | null>(null);
  const [cr, setCr] = useState<CrossRegion | null>(null);
  const [conf, setConf] = useState<Conflict | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    apiGet<RegionInfo>("/api/consistency/info").then(setInfo).catch(() => {});
  }, []);

  async function runCrossRegion() {
    setBusy("cr");
    setCr(null);
    try {
      setCr(await apiPost<CrossRegion>("/api/consistency/cross-region", {}));
    } finally {
      setBusy(null);
    }
  }
  async function runConflict() {
    setBusy("conf");
    setConf(null);
    try {
      setConf(await apiPost<Conflict>("/api/consistency/conflict", {}));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Live Consistency Lab
        <InfoButton topicId="dsql.consistency" />
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        The two guarantees that make Aurora DSQL the right database for safety-critical
        decisions — run them yourself, against the live cluster.
      </p>

      {info && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <Pill tone="emerald">Region A · {info.regionA}</Pill>
          {info.regionB && <Pill tone="sky">Region B · {info.regionB}</Pill>}
          {info.witnessRegion && <Pill tone="slate">Witness · {info.witnessRegion}</Pill>}
          {info.multiRegion ? (
            <Pill tone="emerald">● multi-region active-active</Pill>
          ) : (
            <Pill tone="slate">single-region</Pill>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Cross-region */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">
            No stale-safe read, across regions
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Issue a recall on Region A’s endpoint, then read it back from Region B’s
            endpoint — immediately.
          </p>

          <button
            onClick={runCrossRegion}
            disabled={busy === "cr"}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy === "cr" ? "Running…" : "Write to Region A → read from Region B"}
          </button>

          {cr && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <RegionPanel
                title={`Region A · ${cr.regionA}`}
                subtitle="wrote the recall"
                status="RECALLED"
                epoch={cr.epoch}
                tone="emerald"
              />
              <RegionPanel
                title={`Region B · ${cr.regionB}`}
                subtitle="read immediately after"
                status={cr.after.status}
                epoch={cr.after.epoch}
                tone={cr.after.status === "RECALLED" ? "sky" : "red"}
              />
              <div className="col-span-2">
                <p className="text-xs text-slate-500">
                  Region B before write: {cr.before.status} (epoch {cr.before.epoch})
                </p>
                <div
                  className={`mt-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    cr.instant
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {cr.instant
                    ? "✓ Region B saw the recall instantly — no replication-lag window."
                    : "✗ Region B read stale state."}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* OCC conflict */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">
            Optimistic concurrency, on the guard row
            <InfoButton topicId="gate.checkout" />
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Two transactions write the same model’s safety guard at once. DSQL lets one
            commit and rejects the other — the conflict our retry wrapper handles.
          </p>

          <button
            onClick={runConflict}
            disabled={busy === "conf"}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy === "conf" ? "Running…" : "Fire two conflicting transactions"}
          </button>

          {conf && (
            <div className="mt-5 space-y-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                ✓ {conf.winner}
              </div>
              {conf.loser ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                  <div className="font-semibold text-red-800">
                    ✕ Transaction B rejected
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <code className="rounded bg-white px-2 py-0.5 text-xs text-red-700">
                      SQLSTATE {conf.loser.code}
                    </code>
                    {conf.loser.subCode && (
                      <code className="rounded bg-white px-2 py-0.5 text-xs text-red-700">
                        {conf.loser.subCode}
                      </code>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{conf.loser.message}</p>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  No conflict surfaced this run — try again.
                </div>
              )}
              <p className="text-xs text-slate-500">
                In the app, the losing transaction retries with backoff and re-reads the
                new truth — so the decision is always correct.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "emerald" | "sky" | "slate" | "red" }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    slate: "bg-slate-100 text-slate-600",
    red: "bg-red-50 text-red-700",
  };
  return <span className={`rounded-full px-2.5 py-1 font-medium ${tones[tone]}`}>{children}</span>;
}

function RegionPanel({
  title,
  subtitle,
  status,
  epoch,
  tone,
}: {
  title: string;
  subtitle: string;
  status: string;
  epoch: number;
  tone: "emerald" | "sky" | "red";
}) {
  const ring = {
    emerald: "border-emerald-200",
    sky: "border-sky-200",
    red: "border-red-200",
  }[tone];
  return (
    <div className={`rounded-xl border ${ring} bg-white p-3`}>
      <div className="text-xs font-medium text-slate-500">{title}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">{subtitle}</div>
      <div className="mt-2 text-lg font-bold text-slate-900">{status}</div>
      <div className="text-xs text-slate-500">epoch {epoch}</div>
    </div>
  );
}
