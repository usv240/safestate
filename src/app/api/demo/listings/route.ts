import { DEMO } from "@/lib/demo/fixtures";
import { getProductStatus } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/** Backend-driven marketplace listings for the Gate demo. The frontend renders
 *  exactly what this returns, no product data is hardcoded client-side. */
export async function GET() {
  try {
    const ids = [DEMO.recalledInstanceId, DEMO.safeInstanceId];
    const listings = [];
    for (const id of ids) {
      const s = await getProductStatus(id);
      if (!s) continue;
      listings.push({
        instanceId: s.instance.id,
        title: `${s.instance.manufacturer_name} ${s.instance.model_name}`,
        category: s.instance.category,
        serial: s.instance.serial,
        guardStatus: s.instance.guard_status,
        priceLabel: "$120",
        condition: "Used - good condition",
        directives: s.directives,
      });
    }
    return Response.json({
      buyerId: DEMO.buyerId,
      sellerId: DEMO.sellerId,
      modelId: DEMO.modelId,
      listings,
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
