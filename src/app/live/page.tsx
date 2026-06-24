"use client";

import { useEffect, useState } from "react";
import {
  Database,
  Zap,
  GitCompareArrows,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  Radio,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/client/api";
import { Badge, Button, Card, Container, Eyebrow, cn } from "@/components/ui";
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
    <main>
      <Container className="py-12">
        <Eyebrow>Proof</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">
          Live Consistency Lab
          <InfoButton topicId="dsql.consistency" />
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-500">
          The two guarantees that make Aurora DSQL the right database for safety-critical
          decisions — run them yourself, against the live cluster.
        </p>

        {info && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge tone="brand"><Database className="h-3.5 w-3.5" /> Region A · {info.regionA}</Badge>
            {info.regionB && <Badge tone="sky"><Database className="h-3.5 w-3.5" /> Region B · {info.regionB}</Badge>}
            {info.witnessRegion && <Badge tone="slate">Witness · {info.witnessRegion}</Badge>}
            {info.multiRegion && (
              <Badge tone="brand"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> active-active</Badge>
            )}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Cross-region */}
          <Card className="flex flex-col p-7">
            <h2 className="flex items-center gap-2 font-semibold text-ink-900">
              <GitCompareArrows className="h-4.5 w-4.5 text-brand-600" />
              No stale-safe read, across regions
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
              Issue a recall on Region A’s endpoint, then read it back from Region B’s endpoint —
              immediately.
            </p>

            <RegionMap
              active={busy === "cr"}
              regionA={cr?.regionA ?? info?.regionA ?? "us-east-1"}
              regionB={cr?.regionB ?? info?.regionB ?? "us-east-2"}
              statusA={cr ? "RECALLED" : "SAFE"}
              statusB={cr ? cr.after.status : "SAFE"}
              epoch={cr?.epoch ?? 0}
            />

            <Button className="mt-6" onClick={runCrossRegion} disabled={busy === "cr"}>
              {busy === "cr" ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</> : <><Zap className="h-4 w-4" /> Write to Region A → read from Region B</>}
            </Button>

            {cr && (
              <div
                className={cn(
                  "mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium animate-fade-up",
                  cr.instant ? "bg-brand-50 text-brand-800" : "bg-red-50 text-red-800",
                )}
              >
                {cr.instant ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {cr.instant
                  ? "Region B saw the recall instantly — no replication-lag window."
                  : "Region B read stale state."}
              </div>
            )}
          </Card>

          {/* OCC conflict */}
          <Card className="flex flex-col p-7">
            <h2 className="flex items-center gap-2 font-semibold text-ink-900">
              <ShieldAlert className="h-4.5 w-4.5 text-brand-600" />
              Optimistic concurrency, on the guard row
              <InfoButton topicId="gate.checkout" />
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
              Two transactions write the same model’s safety guard at once. DSQL lets one commit and
              rejects the other — the conflict our retry wrapper handles.
            </p>

            <div className="mt-5 space-y-3">
              <TxnLane label="Transaction A" state={conf ? "commit" : "idle"} />
              <TxnLane
                label="Transaction B"
                state={conf ? (conf.loser ? "reject" : "commit") : "idle"}
                code={conf?.loser?.code}
                subCode={conf?.loser?.subCode}
              />
            </div>

            <Button className="mt-6" onClick={runConflict} disabled={busy === "conf"}>
              {busy === "conf" ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</> : <><Zap className="h-4 w-4" /> Fire two conflicting transactions</>}
            </Button>

            {conf?.loser && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 animate-fade-up">
                <p className="font-mono text-xs text-ink-700">{conf.loser.message}</p>
                <p className="mt-2 text-xs text-ink-500">
                  In the app, the loser retries with backoff and re-reads the new truth — so the
                  decision is always correct.
                </p>
              </div>
            )}
          </Card>
        </div>
      </Container>
    </main>
  );
}

function RegionMap({
  active,
  regionA,
  regionB,
  statusA,
  statusB,
  epoch,
}: {
  active: boolean;
  regionA: string;
  regionB: string;
  statusA: string;
  statusB: string;
  epoch: number;
}) {
  return (
    <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <RegionNode region={regionA} status={statusA} role="writes" epoch={epoch} tone="brand" />
      <div className="relative h-0.5 w-full min-w-10 overflow-hidden rounded bg-slate-200">
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-brand-500 to-transparent",
            active ? "animate-[shimmer_1.1s_ease-in-out_infinite]" : "opacity-0",
          )}
        />
      </div>
      <RegionNode region={regionB} status={statusB} role="reads" epoch={epoch} tone="sky" pulse={active} />
    </div>
  );
}

function RegionNode({
  region,
  status,
  role,
  epoch,
  tone,
  pulse,
}: {
  region: string;
  status: string;
  role: string;
  epoch: number;
  tone: "brand" | "sky";
  pulse?: boolean;
}) {
  const recalled = status === "RECALLED";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-soft">
      <div className="relative mx-auto inline-flex">
        <span
          className={cn(
            "relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-white",
            tone === "brand" ? "bg-brand-600" : "bg-sky-600",
            pulse && "pulse-ring",
          )}
        >
          <Database className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-2 font-mono text-[11px] text-ink-500">{region}</div>
      <div className="text-[10px] uppercase tracking-wide text-ink-500/70">{role}</div>
      <div className={cn("mt-1.5 text-sm font-bold", recalled ? "text-red-700" : "text-brand-700")}>
        {status}
      </div>
      <div className="text-[11px] text-ink-500">epoch {epoch}</div>
    </div>
  );
}

function TxnLane({
  label,
  state,
  code,
  subCode,
}: {
  label: string;
  state: "idle" | "commit" | "reject";
  code?: string | null;
  subCode?: string | null;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border px-4 py-3 transition-colors",
        state === "commit" && "border-brand-200 bg-brand-50/70",
        state === "reject" && "border-red-200 bg-red-50/70",
        state === "idle" && "border-slate-200 bg-slate-50",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-medium text-ink-900">
        <Radio className="h-4 w-4 text-ink-500" /> {label}
      </span>
      {state === "idle" && <span className="text-xs text-ink-500">waiting</span>}
      {state === "commit" && (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
          <CheckCircle2 className="h-4 w-4" /> committed
        </span>
      )}
      {state === "reject" && (
        <span className="inline-flex items-center gap-2">
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-red-700 ring-1 ring-red-200">{code}</code>
          {subCode && <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-red-700 ring-1 ring-red-200">{subCode}</code>}
          <XCircle className="h-4 w-4 text-red-600" />
        </span>
      )}
    </div>
  );
}
