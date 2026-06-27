import { scanCatalog } from "@/lib/safety/scan";
import { recordEvent } from "@/lib/events/dynamo";

export const dynamic = "force-dynamic";

const ORIGIN = "https://safestate.vercel.app";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

/**
 * A chrome-free, embeddable verdict badge. A marketplace drops this into any
 * listing page with one iframe and gets a live recall verdict from the same
 * source SafeState's own gate reads. Rendered server-side; inputs escaped.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const model = (searchParams.get("model") ?? "").trim();
  const serial = (searchParams.get("serial") ?? "").trim() || null;

  let status: "BLOCKED" | "CLEAR" | "UNKNOWN" = "UNKNOWN";
  let hazard = "";
  if (model) {
    try {
      const r = await scanCatalog([{ model, serial }]);
      status = r.results[0].status;
      hazard = r.results[0].hazard ?? "";
      await recordEvent("verify", `embed: ${model}`);
    } catch {
      /* render UNKNOWN */
    }
  }

  const color = status === "BLOCKED" ? "#dc2626" : status === "CLEAR" ? "#059669" : "#d97706";
  const title =
    status === "BLOCKED" ? "Recalled, do not resell" : status === "CLEAR" ? "No recall on record" : "Not in registry";
  const sub =
    status === "BLOCKED"
      ? esc(hazard || "An active recall covers this unit.")
      : status === "CLEAR"
        ? `${esc(model)}${serial ? ` · serial ${esc(serial)}` : ""}`
        : "Confirm at CPSC.gov before resale.";
  const link = `${ORIGIN}/verify?model=${encodeURIComponent(model)}${serial ? `&serial=${encodeURIComponent(serial)}` : ""}`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}html,body{margin:0}body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:transparent}
.w{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}
.dot{width:10px;height:10px;border-radius:99px;flex:none;box-shadow:0 0 0 3px ${color}22}
.t{font-size:14px;font-weight:700;line-height:1.2;color:${color}}
.s{font-size:12px;color:#6b7280;margin-top:2px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.b{margin-left:auto;font-size:11px;color:#9ca3af;text-decoration:none;white-space:nowrap;align-self:flex-start}
</style></head><body><div class="w">
<span class="dot" style="background:${color}"></span>
<div><div class="t">${title}</div><div class="s">${sub}</div></div>
<a class="b" href="${link}" target="_blank" rel="noopener">SafeState &#8599;</a>
</div></body></html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": "frame-ancestors *",
    },
  });
}
