import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone, Ban, Radio, Search, ShieldCheck, ArrowRight, Clock } from "lucide-react";
import { Card, Container, Eyebrow, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "90-second tour" };

const STEPS = [
  {
    Icon: Megaphone,
    title: "Issue a recall",
    href: "/console",
    cta: "Open the Console",
    todo: "Click “Load demo recall”, then “Publish directive”.",
    proves: "The safety epoch bumps, and SafeState identifies the current owners to notify. Precision and reach, in one action.",
  },
  {
    Icon: Ban,
    title: "Watch it block a sale",
    href: "/gate",
    cta: "Open the Gate",
    todo: "Buy serial 100, then serial 5000.",
    proves: "Serial 100 is BLOCKED with the hazard; serial 5000 is AUTHORIZED. Same model, precise to the serial number. This is the executable recall.",
  },
  {
    Icon: Radio,
    title: "See why it needs Aurora DSQL",
    href: "/live",
    cta: "Open the Live Lab",
    todo: "Run the cross-region read, then “Fire two conflicting transactions”, then the stress test.",
    proves: "A real cross-region read with no lag, a genuine OCC race (the winner varies), and 100 concurrent attempts with zero recalled units sold. The technical core.",
  },
  {
    Icon: Search,
    title: "Check anything, for anyone",
    href: "/check",
    cta: "Open Check",
    todo: "Search a product, a food, or a vehicle (try “Honda Civic 2018”).",
    proves: "Live results from CPSC, FDA, and NHTSA at once. A public safety utility anyone can use for anything.",
  },
  {
    Icon: ShieldCheck,
    title: "The part nobody else does",
    href: "/verify",
    cta: "Open Safe Handoff",
    todo: "Check a used item, then save a receipt and grab the QR.",
    proves: "The recall reaches a peer-to-peer cash sale that no marketplace controls, with durable proof. This is the original wedge.",
  },
];

export default function TourPage() {
  return (
    <Container className="py-12">
      <div className="max-w-2xl">
        <Eyebrow>For reviewers</Eyebrow>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-semibold tracking-tight text-fg">
          The 90-second tour
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          The fastest path through SafeState. Five steps, in order. Everything is live and public, and runs on two AWS
          databases: Aurora DSQL for the transactional core, DynamoDB for activity and receipts.
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand-700">
          <Clock className="h-4 w-4" /> About 90 seconds end to end.
        </p>
      </div>

      <ol className="mt-8 space-y-4">
        {STEPS.map(({ Icon, title, href, cta, todo, proves }, i) => (
          <li key={href}>
            <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface2 text-fg2">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-fg">{title}</h2>
                <p className="mt-1 text-sm text-fg2"><span className="font-medium text-fg">Do this:</span> {todo}</p>
                <p className="mt-0.5 text-sm text-muted"><span className="font-medium text-fg2">What it proves:</span> {proves}</p>
              </div>
              <Link href={href} className={buttonClass("primary", "sm", "shrink-0")}>
                {cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          </li>
        ))}
      </ol>

      <p className="mt-8 text-center text-sm text-muted">
        That is the whole product in five steps. <Link href="/" className="font-medium text-brand-700 hover:underline">Back to home</Link>
      </p>
    </Container>
  );
}
