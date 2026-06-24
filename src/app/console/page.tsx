"use client";

import { useEffect, useState } from "react";
import { Megaphone, Send, Wand2, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { apiGet, apiPost } from "@/lib/client/api";
import { Badge, Button, Card, Container, Eyebrow } from "@/components/ui";
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
    <main>
      <Container className="py-12">
        <Eyebrow>Manufacturer · Safety operations</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">
          {b("console.heading")?.title ?? "Manufacturer / Safety Console"}
          <InfoButton topicId="console.issue" />
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-500">
          {b("console.explainer")?.body_md ?? ""}
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="p-7">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-ink-900">
                <Megaphone className="h-4.5 w-4.5 text-brand-600" /> Issue a safety directive
                <InfoButton topicId="console.scope" />
              </h2>
              <button
                onClick={loadDemoRecall}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
              >
                <Wand2 className="h-3.5 w-3.5" /> Load demo recall
              </button>
            </div>

            <div className="mt-5 grid gap-3.5">
              <Row label="Kind">
                <Select value={kind} onChange={(v) => setKind(v as typeof kind)} options={KINDS} />
              </Row>
              <Row label="Scope">
                <Select value={scope} onChange={(v) => setScope(v as typeof scope)} options={SCOPES} />
              </Row>
              {scope !== "MODEL" && (
                <Row label={scope === "UNIT" ? "Serial" : "Serial from"}>
                  <Input value={rangeLo} onChange={setRangeLo} mono />
                </Row>
              )}
              {scope === "SERIAL_RANGE" && (
                <Row label="Serial to">
                  <Input value={rangeHi} onChange={setRangeHi} mono />
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

            <Button variant="danger" className="mt-6 w-full" onClick={submit} disabled={busy || !modelId}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</> : <><Send className="h-4 w-4" /> Publish directive</>}
            </Button>

            {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
            {result && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50/70 p-3.5 text-sm text-brand-800 animate-fade-up">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Published. Model safety epoch is now <b>{result.newEpoch}</b> (txn attempts {result.attempts}).
                  Open the Marketplace Gate — affected units are now blocked.
                </span>
              </div>
            )}
          </Card>

          <Card className="p-7">
            <h2 className="font-semibold text-ink-900">Active directives</h2>
            <p className="mt-1 text-sm text-ink-500">Everything enforced on this model right now.</p>
            {directives.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-ink-500">
                No directives yet. Publish one to see it enforced instantly.
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {directives.map((d, i) => (
                  <li key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <Badge tone="red">
                        <AlertTriangle className="h-3 w-3" /> {d.kind}
                      </Badge>
                      {d.source && <span className="text-xs text-ink-500">via {d.source}</span>}
                    </div>
                    {d.hazard && <p className="mt-2 text-sm text-ink-700">{d.hazard}</p>}
                    {d.remedy && <p className="mt-1 text-sm text-ink-500">Remedy: {d.remedy}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </Container>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid grid-cols-[112px_1fr] items-center gap-3">
      <span className="text-xs font-medium text-ink-500">{label}</span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-ink-900 shadow-sm outline-none transition-colors placeholder:text-ink-500/60 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${mono ? "font-mono" : ""}`}
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
      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-ink-900 shadow-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
