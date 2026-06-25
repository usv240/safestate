import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Ban, CheckCircle2, CircleHelp, ArrowRight } from "lucide-react";
import { getReceipt } from "@/lib/events/dynamo";
import { Card, Container } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Safety Receipt ${id.slice(0, 6).toUpperCase()}` };
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getReceipt(id);
  if (!r) notFound();

  const recalled = r.status === "BLOCKED";
  const clear = r.status === "CLEAR";
  const when = new Date(r.checkedAt).toLocaleString();
  const verdict = recalled ? "RECALLED" : clear ? "CLEAR" : "UNCONFIRMED";
  const reverify = `/verify?model=${encodeURIComponent(r.model)}${r.serial ? `&serial=${encodeURIComponent(r.serial)}` : ""}`;

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-xl">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-fg">
              <ShieldCheck className="h-5 w-5 text-brand-600" /> SafeState Safety Receipt
            </div>
            <span className="font-mono text-xs text-muted">#{r.id.slice(0, 8).toUpperCase()}</span>
          </div>

          <div className="p-6">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                recalled
                  ? "bg-red-50 text-red-700 ring-red-600/15"
                  : clear
                    ? "bg-brand-50 text-brand-700 ring-brand-600/15"
                    : "bg-amber-50 text-amber-700 ring-amber-600/15"
              }`}
            >
              {recalled ? <Ban className="h-3.5 w-3.5" /> : clear ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleHelp className="h-3.5 w-3.5" />}
              {verdict}
            </span>

            <p className="mt-4 text-[15px] leading-relaxed text-fg">
              On <span className="font-medium">{when}</span>,{" "}
              <span className="font-medium">{r.model}</span>
              {r.serial ? <> (serial <span className="font-mono">{r.serial}</span>)</> : null} was checked against live
              recall data and found{" "}
              <span
                className={`font-semibold ${recalled ? "text-red-700" : clear ? "text-brand-700" : "text-amber-700"}`}
              >
                {verdict.toLowerCase()}
              </span>
              .
            </p>

            {recalled && r.hazard && (
              <p className="mt-3 text-sm text-fg2"><span className="font-semibold text-red-700">Hazard:</span> {r.hazard}</p>
            )}
            {recalled && r.remedy && (
              <p className="mt-1 text-sm text-fg2"><span className="font-medium">Remedy:</span> {r.remedy}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-border/60 bg-surface/60 px-6 py-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono">verification hash · {r.hash}</span>
            <Link href={reverify} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:text-brand-800">
              Re-check live now <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        <p className="mt-3 text-center text-xs text-muted">
          This receipt records a check made at the time shown, stored durably in Amazon DynamoDB. A recall can be issued
          at any time, so re-check for the current status.
        </p>
      </div>
    </Container>
  );
}
