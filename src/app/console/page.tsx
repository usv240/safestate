"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/client/api";
import { InfoButton } from "@/components/InfoButton";

interface Block { key: string; title: string | null; body_md: string | null }
interface Directive { kind: string; hazard: string | null; remedy: string | null; source: string | null }
interface Listing { directives: Directive[] }
interface ListingsResp { modelId: string; listings: Listing[] }

const KINDS = ["RECALL", "REPAIR", "DESTROY"] as const;
const SCOPES = ["MODEL", "SERIAL_RANGE", "UNIT"] as const;

export default function ConsolePage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [modelId, setModelId] = useState<string | null>(null);
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [result, setResult] = useState<{ newEpoch: number; attempts: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [kind, setKind] = useState<(typeof KINDS)[number]>("RECALL");
  const [scope, setScope] = useState<(typeof SCOPES)[number]>("SERIAL_RANGE");
  const [rangeLo, setRangeLo] = useState("1");
  const [rangeHi, setRangeHi] = useState("999");
  const [hazard, setHazard] = useState("");
  const [remedy, setRemedy] = useState("");
  const [source, setSource] = useState("CPSC");

  async function load() {
    const [c, l] = await Promise.all([
      apiGet<{ blocks: Block[] }>("/api/content/console"),
      apiGet<ListingsResp>("/api/demo/listings"),
    ]);
    setBlocks(c.blocks);
    setModelId(l.modelId);
    setDirectives(l.listings.flatMap((x) => x.directives));
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const b = (k: string) => blocks.find((x) => x.key === k);

  function loadDemoRecall() {
    setKind("RECALL");
    setScope("SERIAL_RANGE");
    setRangeLo("1");
    setRangeHi("999");
    setHazard("Side rail can detach, posing a fall and entrapment hazard to infants.");
    setRemedy("Stop use immediately. Contact the manufacturer for a full refund.");
    setSource("CPSC");
  }

  async function submit() {
    if (!modelId) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const res = await apiPost<{ newEpoch: number; attempts: number }>("/api/directives", {
        modelId,
        kind,
        hazard: hazard || undefined,
        remedy: remedy || undefined,
        source: source || undefined,
        target: {
          scope,
          rangeLo: scope === "MODEL" ? undefined : rangeLo,
          rangeHi: scope === "SERIAL_RANGE" ? rangeHi : undefined,
        },
      });
      setResult(res);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        {b("console.heading")?.title ?? "Manufacturer / Safety Console"}
        <InfoButton topicId="console.issue" />
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        {b("console.explainer")?.body_md ?? ""}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">
              Issue a safety directive
              <InfoButton topicId="console.scope" />
            </h2>
            <button onClick={loadDemoRecall} className="text-xs font-medium text-emerald-700 hover:underline">
              Load demo recall
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <Row label="Kind">
              <Select value={kind} onChange={(v) => setKind(v as typeof kind)} options={KINDS} />
            </Row>
            <Row label="Scope">
              <Select value={scope} onChange={(v) => setScope(v as typeof scope)} options={SCOPES} />
            </Row>
            {scope !== "MODEL" && (
              <Row label={scope === "UNIT" ? "Serial" : "Serial from"}>
                <Input value={rangeLo} onChange={setRangeLo} />
              </Row>
            )}
            {scope === "SERIAL_RANGE" && (
              <Row label="Serial to">
                <Input value={rangeHi} onChange={setRangeHi} />
              </Row>
            )}
            <Row label="Hazard">
              <Input value={hazard} onChange={setHazard} placeholder="Describe the hazard" />
            </Row>
            <Row label="Remedy">
              <Input value={remedy} onChange={setRemedy} placeholder="Refund / repair / return" />
            </Row>
            <Row label="Source">
              <Input value={source} onChange={setSource} />
            </Row>
          </div>

          <button
            onClick={submit}
            disabled={busy || !modelId}
            className="mt-5 w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "Publishing…" : "Publish directive"}
          </button>

          {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
          {result && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Published. Model safety epoch is now <b>{result.newEpoch}</b> (txn attempts {result.attempts}).
              Open the Marketplace Gate — affected units are now blocked.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Active directives on this model</h2>
          {directives.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">None yet. Publish one to see it enforced.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {directives.map((d, i) => (
                <li key={i} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                    {d.kind}
                  </span>
                  {d.hazard && <p className="mt-1 text-slate-700">{d.hazard}</p>}
                  {d.remedy && <p className="mt-1 text-slate-500">Remedy: {d.remedy}</p>}
                  {d.source && <p className="mt-0.5 text-xs text-slate-400">Source: {d.source}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid grid-cols-[110px_1fr] items-center gap-3">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-500"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
