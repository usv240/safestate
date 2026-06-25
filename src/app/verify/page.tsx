"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { Ban, CheckCircle2, CircleHelp, Loader2, Copy, Check, ShieldCheck, FileText } from "lucide-react";
import { Button, buttonClass, Card, Container, Eyebrow, cn } from "@/components/ui";
import { InfoHint } from "@/components/InfoHint";
import { apiGet, apiPost } from "@/lib/client/api";

interface VerifyResult {
  model: string;
  serial: string | null;
  status: "BLOCKED" | "CLEAR" | "UNKNOWN";
  hazard?: string;
  remedy?: string;
  source?: string;
  kind?: string;
  checkedAt: string;
}

function buildShareUrl(model: string, serial: string | null) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://safestate.vercel.app";
  const q = new URLSearchParams({ model, ...(serial ? { serial } : {}) });
  return `${origin}/verify?${q.toString()}`;
}

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [model, setModel] = useState(params.get("model") ?? "");
  const [serial, setSerial] = useState(params.get("serial") ?? "");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const runCheck = useCallback(async (m: string, s: string) => {
    if (!m.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const q = new URLSearchParams({ model: m.trim(), ...(s.trim() ? { serial: s.trim() } : {}) });
      const r = await apiGet<VerifyResult>(`/api/verify?${q.toString()}`);
      setResult(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  // Arriving via a shared link or QR scan: check immediately.
  useEffect(() => {
    const m = params.get("model");
    if (m) runCheck(m, params.get("serial") ?? "");
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function check(e?: FormEvent) {
    e?.preventDefault();
    const q = new URLSearchParams({ model: model.trim(), ...(serial.trim() ? { serial: serial.trim() } : {}) });
    router.replace(`/verify?${q.toString()}`);
    runCheck(model, serial);
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <Container className="py-12">
      <div className="max-w-2xl">
        <Eyebrow>For everyone</Eyebrow>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-semibold tracking-tight text-fg">
          <ShieldCheck className="h-7 w-7 text-brand-600" strokeWidth={2} />
          Safe Handoff
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Buying or passing on a used product? Check it for a recall in seconds. No account, no app. Share the
          result so the warning travels with the item to whoever has it next.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-2">
          <form onSubmit={check}>
            <label htmlFor="model" className="text-sm font-semibold text-fg">Product model</label>
            <input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="DreamNest Bassinet"
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-fg outline-none placeholder:text-muted/70 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
            <label htmlFor="serial" className="mt-4 block text-sm font-semibold text-fg">
              Serial number <span className="font-normal text-muted">(optional, more precise)</span>
            </label>
            <input
              id="serial"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="100"
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 font-mono text-sm text-fg outline-none placeholder:text-muted/70 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
            <div className="mt-4 flex items-center gap-2">
              <Button type="submit" className="flex-1" disabled={busy || !model.trim()}>
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</> : "Check this product"}
              </Button>
              <InfoHint text="Checks this exact unit against live recall state, then lets you share a link plus QR and save a durable receipt. No account needed." />
            </div>
            {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Try <button type="button" className="font-medium text-brand-700 underline" onClick={() => { setModel("DreamNest Bassinet"); setSerial("100"); }}>a recalled unit</button>
              {" "}or{" "}
              <button type="button" className="font-medium text-brand-700 underline" onClick={() => { setModel("DreamNest Bassinet"); setSerial("5000"); }}>a safe one</button>.
            </p>
          </form>
        </Card>

        <div className="lg:col-span-3">
          {result ? (
            <Verdict result={result} onCopy={copyLink} copied={copied} />
          ) : (
            <Card className="flex h-full min-h-64 flex-col items-center justify-center p-8 text-center">
              <ShieldCheck className="h-10 w-10 text-muted" strokeWidth={1.25} />
              <p className="mt-3 max-w-sm text-sm text-muted">
                Enter a product to get a live recall verdict, a plain-language action plan, and a link plus QR you
                can hand to the next person.
              </p>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}

function Verdict({ result, onCopy, copied }: { result: VerifyResult; onCopy: (u: string) => void; copied: boolean }) {
  const url = buildShareUrl(result.model, result.serial);
  const recalled = result.status === "BLOCKED";
  const clear = result.status === "CLEAR";
  const when = new Date(result.checkedAt).toLocaleString();
  const sourceIsUrl = result.source ? /^https?:\/\//i.test(result.source) : false;
  const [receipt, setReceipt] = useState<{ id: string } | null>(null);
  const [minting, setMinting] = useState(false);

  async function mint() {
    setMinting(true);
    try {
      setReceipt(await apiPost<{ id: string }>("/api/receipt", { model: result.model, serial: result.serial }));
    } catch {
      /* ignore */
    } finally {
      setMinting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "overflow-hidden rounded-xl2 border shadow-soft",
          recalled ? "border-red-200 bg-red-50/70" : clear ? "border-brand-200 bg-brand-50/70" : "border-amber-200 bg-amber-50/70",
        )}
      >
        <div className="flex items-center gap-4 p-6">
          <span
            className={cn(
              "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-soft",
              recalled ? "bg-red-600" : clear ? "bg-brand-600" : "bg-amber-500",
            )}
          >
            {recalled ? <Ban className="h-6 w-6" /> : clear ? <CheckCircle2 className="h-6 w-6" /> : <CircleHelp className="h-6 w-6" />}
          </span>
          <div>
            <div className={cn("text-xl font-bold", recalled ? "text-red-800" : clear ? "text-brand-800" : "text-amber-800")}>
              {recalled ? "RECALLED — do not resell" : clear ? "No recall on record" : "Can't confirm yet"}
            </div>
            <div className="text-sm text-muted">
              {result.model}{result.serial ? <> · <span className="font-mono text-xs">serial {result.serial}</span></> : null}
            </div>
          </div>
        </div>

        {recalled ? (
          <div className="border-t border-red-100 p-6">
            {result.hazard && (
              <p className="text-sm text-red-900"><span className="font-semibold">Hazard:</span> {result.hazard}</p>
            )}
            <div className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-red-700">What to do now</div>
              <ul className="mt-2 space-y-1.5 text-sm text-fg">
                <li>1. Stop using it right away.</li>
                <li>2. Do not sell, donate, or pass it on.</li>
                <li>3. Contact the manufacturer or retailer for the remedy{result.remedy ? <>: <span className="font-medium">{result.remedy}</span></> : "."}</li>
                <li>
                  4. Read the official notice
                  {result.source ? (
                    sourceIsUrl
                      ? <> at <a href={result.source} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">the source</a>.</>
                      : <> from <span className="font-medium">{result.source}</span>.</>
                  ) : "."}
                </li>
              </ul>
            </div>
          </div>
        ) : clear ? (
          <div className="border-t border-brand-100 px-6 py-4 text-sm text-fg">
            No active recall covers this unit. Safe to pass on as of {when}.
          </div>
        ) : (
          <div className="border-t border-amber-100 px-6 py-4 text-sm text-fg">
            This product is not in our registry yet, so we can&apos;t confirm its status. Check{" "}
            <a href="https://www.cpsc.gov/Recalls" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">CPSC.gov/Recalls</a>{" "}
            before passing it on.
          </div>
        )}

        <div className="border-t border-border/60 bg-surface/60 px-6 py-2.5 text-xs text-muted">
          Checked against live recall state in Amazon Aurora DSQL, the same source a marketplace checkout reads. Checked {when}.
        </div>
      </div>

      {/* Share — make the warning travel with the item */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="shrink-0 rounded-xl border border-border bg-white p-3">
            <QRCodeSVG value={url} size={104} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-fg">
              {recalled ? "Share this warning" : "Share this check"}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Attach this to the listing, or show the QR at handoff. Whoever scans it sees the same live answer, not a
              screenshot they have to trust.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input
                readOnly
                value={url}
                className="min-w-0 flex-1 truncate rounded-lg border border-border bg-surface2 px-2.5 py-2 font-mono text-xs text-fg2"
              />
              <Button variant="secondary" size="sm" onClick={() => onCopy(url)}>
                {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Save a durable receipt (stored in DynamoDB) */}
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-fg">Save a Safety Receipt</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              A durable, timestamped proof of this check you can show later, stored in Amazon DynamoDB.
            </p>
          </div>
          {receipt ? (
            <Link href={`/receipt/${receipt.id}`} className={buttonClass("secondary", "sm", "shrink-0")}>
              View receipt
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={mint} disabled={minting}>
                {minting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Save receipt
              </Button>
              <InfoHint text="Re-checks the unit server-side and stores a permanent, hashed receipt in DynamoDB. Proof you can show later that you checked." />
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <Container className="py-12">
          <div className="flex items-center gap-2 text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        </Container>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
