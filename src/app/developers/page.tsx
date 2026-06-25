"use client";

import { Code2, ShieldCheck, RefreshCw, KeyRound } from "lucide-react";
import { Badge, Card, Container, Eyebrow } from "@/components/ui";

const authorizeReq = `POST /api/authorize-transfer
content-type: application/json

{
  "instanceId": "33333333-…",     // the unit being sold
  "toOwnerId":  "66666666-…",     // the buyer
  "idempotencyKey": "a1b2c3d4-…"  // safe to retry
}`;

const authorizeRes = `{
  "decision": "BLOCKED",
  "reason":  "Side rail can detach (entrapment hazard).",
  "remedy":  "Full refund.",
  "source":  "CPSC",
  "guardEpoch": 1,
  "attempts": 1
}`;

const directiveReq = `POST /api/directives

{
  "modelId": "22222222-…",
  "kind": "RECALL",
  "hazard": "…", "remedy": "…", "source": "CPSC",
  "target": { "scope": "SERIAL_RANGE", "rangeLo": "1", "rangeHi": "999" }
}`;

export default function Developers() {
  return (
    <main>
      <Container className="py-12">
        <Eyebrow>Developers</Eyebrow>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          One call at checkout. Recalled products can’t be sold.
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          SafeState is a drop-in compliance API for recommerce marketplaces, thrift chains, and
          resale platforms. Add it to your listing and checkout flows.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden p-0">
            <Header icon={<ShieldCheck className="h-4 w-4" />} title="Authorize a transfer" tone="brand" />
            <CodeBlock>{authorizeReq}</CodeBlock>
            <div className="border-t border-border px-5 py-2 text-xs font-medium text-muted">Response</div>
            <CodeBlock>{authorizeRes}</CodeBlock>
          </Card>

          <div className="space-y-6">
            <Card className="overflow-hidden p-0">
              <Header icon={<Code2 className="h-4 w-4" />} title="Issue a directive" tone="slate" />
              <CodeBlock>{directiveReq}</CodeBlock>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-fg">The contract</h3>
              <ul className="mt-3 space-y-3 text-sm">
                <Contract icon={<KeyRound className="h-4 w-4" />} title="Idempotent">
                  Pass an <code className="font-mono text-xs">idempotencyKey</code>; a retried request
                  returns the same decision and never double-applies a transfer.
                </Contract>
                <Contract icon={<RefreshCw className="h-4 w-4" />} title="Retry-safe">
                  Conflicts surface as <code className="font-mono text-xs">SQLSTATE 40001 / OC000</code>{" "}
                  and are retried with backoff — the decision always reflects the latest safety state.
                </Contract>
                <Contract icon={<ShieldCheck className="h-4 w-4" />} title="Strongly consistent">
                  Reads from any region reflect a recall the instant it commits — no stale-safe window.
                </Contract>
              </ul>
            </Card>
          </div>
        </div>

        <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 p-6">
          <p className="text-sm text-fg2">
            Pricing scales with usage: per safety lookup, protected listing, and authorized transfer.
          </p>
          <div className="flex gap-2">
            <Badge tone="brand">Recommerce marketplaces</Badge>
            <Badge tone="sky">Thrift &amp; consignment</Badge>
            <Badge tone="slate">Manufacturers</Badge>
          </div>
        </Card>
      </Container>
    </main>
  );
}

function Header({ icon, title, tone }: { icon: React.ReactNode; title: string; tone: "brand" | "slate" }) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-5 py-3">
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${tone === "brand" ? "bg-brand-50 text-brand-700" : "bg-surface2 text-fg2"}`}>
        {icon}
      </span>
      <span className="font-semibold text-fg">{title}</span>
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto bg-ink-900 px-5 py-4 text-[12.5px] leading-relaxed text-slate-100">
      <code className="font-mono">{children}</code>
    </pre>
  );
}

function Contract({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        {icon}
      </span>
      <span className="text-muted">
        <b className="text-fg">{title}.</b> {children}
      </span>
    </li>
  );
}
