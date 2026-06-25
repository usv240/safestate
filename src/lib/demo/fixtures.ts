/** Stable IDs for the demo so seed + race scripts operate on the same rows. */
export const DEMO = {
  manufacturerId: "11111111-1111-1111-1111-111111111111",
  manufacturerName: "Nimbus Juvenile Co.", // fictional brand (trademark-safe for the video)
  modelId: "22222222-2222-2222-2222-222222222222",
  modelName: "DreamNest Bassinet",
  category: "bassinet",

  // Instance whose serial (100) falls INSIDE the recalled range 1–999 → BLOCKED
  recalledInstanceId: "33333333-3333-3333-3333-333333333333",
  recalledSerial: "100",

  // Instance whose serial (5000) is OUTSIDE the recalled range → stays SAFE
  safeInstanceId: "44444444-4444-4444-4444-444444444444",
  safeSerial: "5000",

  sellerId: "55555555-5555-5555-5555-555555555555",
  buyerId: "66666666-6666-6666-6666-666666666666",

  recallRange: { lo: "1", hi: "999" },

  // Extra in-the-wild units, already resold to various owners, for the
  // "who needs to know" reach-back demo. The Gate only ever shows the two
  // instances above; these exist so an issued recall has real current owners
  // to reach. Serials 120/340/560/880 fall in the recall range; 4200/7100 do not.
  fleet: [
    { id: "aaaaaaa1-0000-0000-0000-000000000001", serial: "120", owner: "70000000-0000-0000-0000-000000000001" },
    { id: "aaaaaaa1-0000-0000-0000-000000000002", serial: "340", owner: "70000000-0000-0000-0000-000000000002" },
    { id: "aaaaaaa1-0000-0000-0000-000000000003", serial: "560", owner: "70000000-0000-0000-0000-000000000002" },
    { id: "aaaaaaa1-0000-0000-0000-000000000004", serial: "880", owner: "70000000-0000-0000-0000-000000000003" },
    { id: "aaaaaaa1-0000-0000-0000-000000000005", serial: "4200", owner: "70000000-0000-0000-0000-000000000004" },
    { id: "aaaaaaa1-0000-0000-0000-000000000006", serial: "7100", owner: "70000000-0000-0000-0000-000000000001" },
  ],
} as const;
