"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client/api";

interface DbInfo {
  name: string;
  role: string;
  status: "ok" | "down";
  detail: string;
}
interface Health {
  primary: DbInfo;
  secondary: DbInfo;
}

export function DbStatus() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    apiGet<Health>("/api/health").then(setHealth).catch(() => {});
  }, []);

  if (!health) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Pill db={health.primary} />
      <Pill db={health.secondary} />
    </div>
  );
}

function Pill({ db }: { db: DbInfo }) {
  const ok = db.status === "ok";
  return (
    <div className="group relative">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-fg2 transition-colors group-hover:text-fg">
        <span className="relative flex h-2 w-2">
          {ok && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
          )}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${ok ? "bg-brand-500" : "bg-red-500"}`} />
        </span>
        <span className="font-medium">{db.name}</span>
        <span className="text-muted">· {db.role}</span>
      </span>

      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-xl border border-border bg-surface p-3 text-left opacity-0 shadow-lift transition-opacity duration-150 group-hover:opacity-100">
        <div className="text-sm font-semibold text-fg">{db.name}</div>
        <div className="mt-1 text-xs leading-relaxed text-muted">{db.detail}</div>
        <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium ${ok ? "text-brand-700" : "text-red-700"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-brand-500" : "bg-red-500"}`} />
          {ok ? "Live and reachable" : "Unavailable"}
        </div>
      </div>
    </div>
  );
}
