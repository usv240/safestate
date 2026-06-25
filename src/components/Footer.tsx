import Link from "next/link";
import { DbStatus } from "@/components/DbStatus";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/70">
      <div className="mx-auto w-full max-w-6xl px-5 py-8">
        <div className="mb-6 flex justify-center">
          <DbStatus />
        </div>
        <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted sm:flex-row">
          <p>
            SafeState — recalls, made executable. Built on{" "}
            <span className="font-medium text-fg2">Amazon Aurora DSQL</span> +{" "}
            <span className="font-medium text-fg2">Amazon DynamoDB</span> +{" "}
            <span className="font-medium text-fg2">Vercel</span>.
          </p>
          <div className="flex flex-wrap items-center gap-4">
          <Link href="/how-it-works" className="hover:text-fg">
            How it works
          </Link>
          <Link href="/developers" className="hover:text-fg">
            Developers
          </Link>
          <Link href="/recalls" className="hover:text-fg">
            Recalls
          </Link>
          <Link href="/match" className="hover:text-fg">
            AI Match
          </Link>
          <Link href="/live" className="hover:text-fg">
            Live Consistency
          </Link>
          <a
            href="https://aws.amazon.com/rds/aurora/dsql/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-fg"
          >
            Aurora DSQL
          </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
