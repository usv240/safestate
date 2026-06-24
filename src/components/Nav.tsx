"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/components/ui";

const links = [
  { href: "/gate", label: "Gate" },
  { href: "/console", label: "Console" },
  { href: "/passport", label: "Passport" },
  { href: "/live", label: "Live" },
  { href: "/recalls", label: "Recalls" },
  { href: "/match", label: "Match" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 glass">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft">
            <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink-900">
            SafeState
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-100 text-ink-900"
                    : "text-ink-700 hover:bg-slate-50 hover:text-ink-900",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/live"
          className="rounded-lg bg-ink-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-700 md:hidden"
        >
          Live
        </Link>
      </div>
    </header>
  );
}
