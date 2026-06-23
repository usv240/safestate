import Link from "next/link";

export function Nav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-xs font-bold text-white">
            S
          </span>
          SafeState
        </Link>
        <nav className="flex items-center gap-5 text-sm text-slate-600">
          <Link href="/gate" className="hover:text-slate-900">
            Marketplace Gate
          </Link>
          <Link href="/console" className="hover:text-slate-900">
            Manufacturer Console
          </Link>
          <Link href="/live" className="hover:text-slate-900">
            Live Consistency
          </Link>
        </nav>
      </div>
    </header>
  );
}
