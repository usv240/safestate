import { withTxnRetry } from "../db/retry";

/** Seeds the backend-driven content layer: every word the UI shows, every
 *  "ⓘ" help popover, and the guided-tour steps. The frontend hardcodes none
 *  of this — it fetches it. Idempotent (wipe + insert). */
export async function seedContent(): Promise<void> {
  const content: [string, string, string, string][] = [
    // key, surface, title, body_md
    ["home.hero", "home", "Recalls, made executable.",
      "A recall is just information until something acts on it. SafeState turns recall status into a decision enforced the moment a product is resold — so a recalled crib can't be sold to the next family."],
    ["home.how", "home", "How it works",
      "1. Manufacturers and CPSC data publish safety directives.\n2. Every marketplace checks SafeState at listing and at checkout.\n3. Aurora DSQL's strong consistency means the instant a recall commits, no marketplace anywhere can read a stale \"safe\" status."],
    ["home.why", "home", "Why it matters",
      "Reselling recalled products is illegal, and recalled infant products have caused deaths. Today sellers must discover recalls manually. SafeState makes the safe path the automatic one."],
    ["gate.heading", "gate", "Marketplace Safety Gate",
      "This is what a marketplace sees. Each listing is checked against live safety state before money changes hands."],
    ["gate.explainer", "gate", "What you're looking at",
      "Two real listings of the same model. One unit falls inside an active recall's serial range; the other does not. Watch the gate authorize one and block the other — precisely."],
    ["console.heading", "console", "Manufacturer / Safety Console",
      "Issue a recall against a model — by serial range, lot, or unit. The moment it commits, every marketplace gate sees it."],
    ["console.explainer", "console", "Precision targeting",
      "A recall rarely covers every unit ever made. Target an exact serial range so safe units keep selling and only affected units are blocked."],
    ["tech.consistency", "tech", "The guarantee",
      "SafeState is built on Amazon Aurora DSQL. A recall and a sale of the same model write the same guard row, so DSQL's optimistic concurrency control detects the conflict (SQLSTATE 40001 / OC000) and the losing transaction retries against the new truth. Result: no stale-safe read, ever."],
    ["passport.heading", "passport", "Safety Passport",
      "Every product carries a living safety record that follows it from owner to owner — not just the original buyer."],
    ["passport.explainer", "passport", "Why this matters",
      "When a product is resold, the recall obligation should travel with it. SafeState keeps a per-unit safety history and can reach whoever owns it now — even years after the first sale."],
  ];

  const help: [string, string, string, string | null][] = [
    ["gate.verdict", "Why this verdict?",
      "The gate evaluates every active safety directive against this unit's serial number. If a recall covers it, the sale is BLOCKED with the hazard and remedy. If not, it's AUTHORIZED.", null],
    ["gate.checkout", "What happens at checkout",
      "Buying calls authorize-transfer. It runs as one Aurora DSQL transaction that records the transfer and touches the model's guard row — which is what lets a simultaneous recall conflict and win.", null],
    ["console.issue", "Issuing a directive",
      "Pick a kind (recall / repair / destroy) and a target scope. SafeState bumps the model's safety epoch so every future read reflects the change immediately.", null],
    ["console.scope", "Target scope",
      "MODEL covers all units. SERIAL_RANGE covers serials between low and high. UNIT covers one serial. Use the narrowest scope that captures the hazard.", null],
    ["dsql.consistency", "Strong consistency, globally",
      "Aurora DSQL is active-active across regions with strong consistency. A safety status committed in one region is immediately visible from any region — there is no replication lag window where a recalled product still reads as safe.",
      "https://aws.amazon.com/rds/aurora/dsql/"],
    ["passport.timeline", "The safety record",
      "Each entry is a safety directive (recall, repair, or destroy) issued against this product's model, with the hazard and remedy. The newest is on top. A clear record means none are active.", null],
    ["match.assistant", "How matching works",
      "The assistant compares a listing's text against the live CPSC recall feed. With an Anthropic API key it uses Claude (claude-opus-4-8); otherwise it falls back to a keyword heuristic. High confidence auto-flags, medium routes to review, low passes.", null],
  ];

  const tutorial: [string, number, string, string, string][] = [
    // surface, order, anchor, title, body
    ["gate", 1, "listings", "These are live listings", "Each card's safety badge comes straight from Aurora DSQL — not hardcoded."],
    ["gate", 2, "buy", "Try to buy the recalled unit", "The gate blocks it with the exact hazard and remedy from the recall."],
    ["gate", 3, "buy-safe", "Now buy the safe unit", "Same model, different serial — it sells, proving the block is precise."],
    ["console", 1, "form", "Issue a recall", "Choose a serial range and publish. This writes the authoritative safety state."],
    ["console", 2, "epoch", "Watch the epoch", "Every directive bumps the model's safety epoch — the version every gate reads."],
  ];

  await withTxnRetry(async (client) => {
    await client.query("DELETE FROM content_blocks");
    await client.query("DELETE FROM help_topics");
    await client.query("DELETE FROM tutorial_steps");

    for (const [key, surface, title, body] of content) {
      await client.query(
        "INSERT INTO content_blocks (key, surface, title, body_md) VALUES ($1,$2,$3,$4)",
        [key, surface, title, body],
      );
    }
    for (const [topicId, title, body, url] of help) {
      await client.query(
        "INSERT INTO help_topics (topic_id, title, body_md, learn_more_url) VALUES ($1,$2,$3,$4)",
        [topicId, title, body, url],
      );
    }
    const { randomUUID } = await import("node:crypto");
    for (const [surface, order, anchor, title, body] of tutorial) {
      await client.query(
        "INSERT INTO tutorial_steps (id, surface, step_order, anchor, title, body_md) VALUES ($1,$2,$3,$4,$5,$6)",
        [randomUUID(), surface, order, anchor, title, body],
      );
    }
  });
}
