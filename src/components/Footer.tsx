import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-ink-500 sm:flex-row">
        <p>
          SafeState — recalls, made executable. Built on{" "}
          <span className="font-medium text-ink-700">Amazon Aurora DSQL</span> +{" "}
          <span className="font-medium text-ink-700">Vercel</span>.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/how-it-works" className="hover:text-ink-900">
            How it works
          </Link>
          <Link href="/developers" className="hover:text-ink-900">
            Developers
          </Link>
          <Link href="/recalls" className="hover:text-ink-900">
            Recalls
          </Link>
          <Link href="/live" className="hover:text-ink-900">
            Live Consistency
          </Link>
          <a
            href="https://aws.amazon.com/rds/aurora/dsql/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink-900"
          >
            Aurora DSQL
          </a>
        </div>
      </div>
    </footer>
  );
}
