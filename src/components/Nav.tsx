"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Menu, X } from "lucide-react";
import { cn } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "/gate", label: "Gate" },
  { href: "/scan", label: "Scan" },
  { href: "/verify", label: "Verify" },
  { href: "/console", label: "Console" },
  { href: "/passport", label: "Passport" },
  { href: "/live", label: "Live" },
  { href: "/recalls", label: "Recalls" },
  { href: "/match", label: "Match" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 glass">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <Link href="/" className="group flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft">
            <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-fg">SafeState</span>
        </Link>

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-surface2 text-fg" : "text-fg2 hover:bg-surface2 hover:text-fg",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-fg2 transition-colors hover:bg-surface2 hover:text-fg md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border/70 glass md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-surface2 text-fg" : "text-fg2 hover:bg-surface2 hover:text-fg",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
