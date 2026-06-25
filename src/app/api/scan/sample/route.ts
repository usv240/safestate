import { DEMO } from "@/lib/demo/fixtures";

export const dynamic = "force-dynamic";

/**
 * A small, illustrative catalog a recommerce marketplace might upload. It is
 * built server-side (the UI hardcodes no data) and references the live demo
 * model, so several rows fall inside its active recall range, several outside,
 * and several are models the registry has never seen.
 */
export function GET() {
  const model = DEMO.modelName; // e.g. "DreamNest Bassinet" (covered by recall 1-999)
  const items = [
    { sku: "LOT-A-0100", model, serial: "100" },
    { sku: "LOT-A-0250", model, serial: "250" },
    { sku: "LOT-A-0840", model, serial: "840" },
    { sku: "LOT-B-5000", model, serial: "5000" },
    { sku: "LOT-B-6200", model, serial: "6200" },
    { sku: "PY-1190", model: "Cloudrest Play Yard", serial: "1190" },
    { sku: "HC-0044", model: "Tiny Steps High Chair", serial: "44" },
    { sku: "ST-7782", model: "Skylark Stroller GT", serial: "7782" },
  ];
  return Response.json({ items });
}
