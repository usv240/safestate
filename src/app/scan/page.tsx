"use client";

import { useState } from "react";
import { ScanLine, Loader2, Ban, CheckCircle2, CircleHelp, Sparkles } from "lucide-react";
import { apiGet, apiPost } from "@/lib/client/api";
import { Badge, Button, Card, Container, Eyebrow, cn } from "@/components/ui";
import { InfoHint } from "@/components/InfoHint";

interface ScanRow {
  model: string;
  serial: string | null;
  sku: string | null;
  status: "BLOCKED" | "CLEAR" | "UNKNOWN";
  hazard?: string;
  remedy?: string;
  source?: string;
  kind?: string;
}
interface ScanReport {
  summary: { total: number; blocked: number; clear: number; unknown: number };
  results: ScanRow[];
}
interface SampleItem { model: string; serial: string | null; sku: string | null }

const PLACEHOLDER =
  "Paste your catalog, one unit per line:\n\nmodel, serial, sku\nDreamNest Bassinet, 100, LOT-A-0100\nDreamNest Bassinet, 5000, LOT-B-5000";

function parseCatalog(text: string): SampleItem[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !l.startsWith("#") && !l.toLowerCase().startsWith("model,"))
    .map((line) => {
      const [model, serial, sku] = line.split(",").map((c) => c.trim());
      return { model: model ?? "", serial: serial || null, sku: sku || null };
    })
    .filter((i) => i.model);
}

export default function ScanPage() {
  const [text, setText] = useState("");
  const [report, setReport] = useState<ScanReport | null>(null);
  const [busy, setBusy] = useState<null | "sample" | "scan">(null);
  const [err, setErr] = useState<string | null>(null);

  async function loadSample() {
    setBusy("sample");
    setErr(null);
    try {
      const { items } = await apiGet<{ items: SampleItem[] }>("/api/scan/sample");
      setText(items.map((i) => [i.model, i.serial ?? "", i.sku ?? ""].filter(Boolean).join(", ")).join("\n"));
      setReport(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function scan() {
    const items = parseCatalog(text);
    if (!items.length) {
      setErr("Add at least one line: model, serial, sku");
      return;
    }
    setBusy("scan");
    setErr(null);
    try {
      const r = await apiPost<ScanReport>("/api/scan", { items });
      setReport(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main>
      <Container className="py-12">
        <div className="max-w-2xl">
          <Eyebrow>Marketplace operations</Eyebrow>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-semibold tracking-tight text-fg">
            <ScanLine className="h-7 w-7 text-brand-600" strokeWidth={2} />
            Recall Exposure Scan
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            The single-unit gate checks one sale. This points SafeState at a marketplace&apos;s whole catalog at
            once and reports its recall exposure: how many units are recalled, which hazard, and the remedy. Every
            row is evaluated against live Aurora DSQL safety state, serial by serial.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-5">
          {/* Input */}
          <Card className="p-5 lg:col-span-2">
            <label htmlFor="catalog" className="text-sm font-semibold text-fg">
              Catalog
            </label>
            <p className="mt-1 text-xs text-muted">One unit per line: <span className="font-mono">model, serial, sku</span></p>
            <textarea
              id="catalog"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER}
              spellCheck={false}
              className="mt-3 h-64 w-full resize-y rounded-xl border border-border bg-surface p-3 font-mono text-xs leading-relaxed text-fg outline-none placeholder:text-muted/70 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={loadSample} disabled={busy !== null}>
                {busy === "sample" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Load sample catalog
              </Button>
              <Button size="sm" onClick={scan} disabled={busy !== null || !text.trim()}>
                {busy === "scan" ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning…</> : <>Scan catalog</>}
              </Button>
              <span className="flex items-center">
                <InfoHint text="Evaluates every row against live recall state in two queries, serial by serial, and returns a per-unit verdict plus a summary of your recall exposure." />
              </span>
            </div>
            {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
          </Card>

          {/* Results */}
          <div className="lg:col-span-3">
            {!report ? (
              <Card className="flex h-full min-h-64 flex-col items-center justify-center p-8 text-center">
                <ScanLine className="h-10 w-10 text-muted" strokeWidth={1.25} />
                <p className="mt-3 max-w-sm text-sm text-muted">
                  Load the sample catalog or paste your own, then run a scan. Results appear here with a per-unit
                  verdict drawn from live recall state.
                </p>
              </Card>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Units" value={report.summary.total} tone="slate" />
                  <Stat label="Recalled" value={report.summary.blocked} tone="red" />
                  <Stat label="Clear" value={report.summary.clear} tone="brand" />
                  <Stat label="Not in registry" value={report.summary.unknown} tone="amber" />
                </div>

                {report.summary.blocked > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-800">
                    {report.summary.blocked} of {report.summary.total} units in this catalog are under an active
                    recall and must not be resold.
                  </div>
                )}

                <Card className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface2 text-[11px] uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">Status</th>
                          <th className="px-4 py-2.5 font-semibold">Model</th>
                          <th className="px-4 py-2.5 font-semibold">Serial</th>
                          <th className="px-4 py-2.5 font-semibold">Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.results.map((r, i) => (
                          <tr key={i} className="border-t border-border/60 align-top">
                            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-fg">{r.model}</div>
                              {r.sku && <div className="font-mono text-[11px] text-muted">{r.sku}</div>}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-fg2">{r.serial ?? "—"}</td>
                            <td className="px-4 py-3 text-fg2">
                              {r.status === "BLOCKED" && (
                                <div>
                                  <div>{r.hazard ?? "Active recall"}</div>
                                  {r.remedy && <div className="mt-0.5 text-xs text-muted">Remedy: {r.remedy}</div>}
                                  {r.source && <div className="mt-0.5 text-[11px] text-muted">Source: {r.source}</div>}
                                </div>
                              )}
                              {r.status === "CLEAR" && <span className="text-muted">No active recall</span>}
                              {r.status === "UNKNOWN" && <span className="text-muted">Not in SafeState registry</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-border/60 bg-surface/60 px-4 py-2.5 text-xs text-muted">
                    Evaluated against live Aurora DSQL safety state, serial by serial.
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "slate" | "red" | "brand" | "amber" }) {
  const ring: Record<string, string> = {
    slate: "border-border",
    red: "border-red-200",
    brand: "border-brand-200",
    amber: "border-amber-200",
  };
  const text: Record<string, string> = {
    slate: "text-fg",
    red: "text-red-700",
    brand: "text-brand-700",
    amber: "text-amber-700",
  };
  return (
    <div className={cn("rounded-xl border bg-surface px-4 py-3", ring[tone])}>
      <div className={cn("text-2xl font-bold tabular-nums", text[tone])}>{value}</div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: ScanRow["status"] }) {
  if (status === "BLOCKED") return <Badge tone="red"><Ban className="h-3.5 w-3.5" /> Recalled</Badge>;
  if (status === "CLEAR") return <Badge tone="brand"><CheckCircle2 className="h-3.5 w-3.5" /> Clear</Badge>;
  return <Badge tone="amber"><CircleHelp className="h-3.5 w-3.5" /> Unknown</Badge>;
}
