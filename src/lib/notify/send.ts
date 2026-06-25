import { getAffectedOwners } from "../db/queries";
import { DEMO } from "../demo/fixtures";
import { recordEvent } from "../events/dynamo";

export interface NotifyResult {
  owners: number;
  units: number;
  emailed: boolean;
}

/**
 * When a recall is in effect, notify the current owners of affected units. This
 * is the promise the whole project exists to keep: reach whoever holds the
 * product now. Sends a real email when RESEND_API_KEY + NOTIFY_DEMO_EMAIL are
 * configured; always records the dispatch so it is verifiable either way.
 */
export async function notifyOnRecall(modelId: string): Promise<NotifyResult> {
  const { owners, totalUnits } = await getAffectedOwners(modelId);
  if (owners.length === 0) return { owners: 0, units: 0, emailed: false };

  const recipients = owners.map((o) => ({
    name: DEMO.ownerNames[o.ownerId] ?? "Owner",
    serials: o.units.map((u) => u.serial).join(", "),
  }));

  // Verifiable record of the dispatch (works with no email provider configured).
  await recordEvent("recall", `notified ${owners.length} owners (${totalUnits} units)`);

  let emailed = false;
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_DEMO_EMAIL;
  if (key && to) {
    try {
      const lines = recipients.map((r) => `- ${r.name}: serial ${r.serials}`).join("\n");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: process.env.NOTIFY_FROM || "SafeState <onboarding@resend.dev>",
          to,
          subject: `Recall notice: ${owners.length} owner(s) to warn`,
          text:
            `A recall is now in effect. SafeState identified ${owners.length} current owner(s) of ` +
            `${totalUnits} affected unit(s):\n\n${lines}\n\n` +
            `In production each owner is contacted directly. This is a SafeState demo notification.`,
        }),
      });
      emailed = res.ok;
    } catch {
      emailed = false;
    }
  }

  return { owners: owners.length, units: totalUnits, emailed };
}
