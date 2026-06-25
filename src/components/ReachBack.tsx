"use client";

import { useEffect, useState } from "react";
import { Users, Bell, Loader2 } from "lucide-react";
import { apiGet } from "@/lib/client/api";
import { Badge, Card } from "@/components/ui";

interface Owner {
  ownerId: string;
  units: { serial: string | null }[];
}
interface ReachData {
  directiveKinds: string[];
  totalUnits: number;
  ownerCount: number;
  owners: Owner[];
}

/** "Who needs to know": the current owners SafeState would notify when a recall
 *  is in effect, found by walking live ownership. Re-fetches when refreshKey
 *  changes (i.e. after a new directive is published). */
export function ReachBack({ refreshKey }: { refreshKey?: number }) {
  const [data, setData] = useState<ReachData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet<ReachData>("/api/reach-back")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <Card className="mt-6 p-7">
      <h2 className="flex items-center gap-2 font-semibold text-fg">
        <Users className="h-[18px] w-[18px] text-brand-600" /> Who needs to know
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
        The owners SafeState would notify the instant this recall is in effect: the current owners of affected units,
        found by walking live ownership, not just the original buyers. This is the gap the project exists to close.
      </p>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Finding affected owners…
        </div>
      ) : !data || data.ownerCount === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          No active recall, so no owners need warning. Publish a recall above to see the reach-back.
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-3">
            <Stat n={data.ownerCount} label={data.ownerCount === 1 ? "owner to notify" : "owners to notify"} />
            <Stat n={data.totalUnits} label={data.totalUnits === 1 ? "affected unit" : "affected units"} />
          </div>
          <ul className="mt-4 space-y-2">
            {data.owners.map((o) => (
              <li
                key={o.ownerId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface2 font-mono text-[11px] text-fg2">
                    {o.ownerId.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-fg">Owner {o.ownerId.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">
                    {o.units.length} unit{o.units.length > 1 ? "s" : ""} · serial{o.units.length > 1 ? "s" : ""}{" "}
                    <span className="font-mono">{o.units.map((u) => u.serial).join(", ")}</span>
                  </span>
                  <Badge tone="amber"><Bell className="h-3 w-3" /> notify</Badge>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-2.5">
      <span className="text-xl font-bold tabular-nums text-fg">{n}</span>{" "}
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
