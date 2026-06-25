# SafeState API

SafeState is built to be a drop-in compliance layer for a recommerce marketplace. The integration surface is small: ask SafeState whether a unit is safe to sell, and it answers from live, multi-region safety state.

Base URL: `https://safestate.vercel.app`

All endpoints return JSON. The demo deployment is open for evaluation; a production deployment would put these behind a tenant API key.

## POST /api/scan

Check a whole catalog at once. This is the simplest way to integrate: send the products you list, get back a per-unit verdict and a summary. It uses the same serial-aware recall logic as the single-unit gate.

Request:

```json
{
  "items": [
    { "model": "DreamNest Bassinet", "serial": "100", "sku": "LOT-A-0100" },
    { "model": "DreamNest Bassinet", "serial": "5000", "sku": "LOT-B-5000" },
    { "model": "Cloudrest Play Yard", "serial": "1190", "sku": "PY-1190" }
  ]
}
```

Response:

```json
{
  "summary": { "total": 3, "blocked": 1, "clear": 1, "unknown": 1 },
  "results": [
    { "model": "DreamNest Bassinet", "serial": "100", "sku": "LOT-A-0100",
      "status": "BLOCKED", "hazard": "…", "remedy": "…", "source": "CPSC", "kind": "RECALL" },
    { "model": "DreamNest Bassinet", "serial": "5000", "sku": "LOT-B-5000", "status": "CLEAR" },
    { "model": "Cloudrest Play Yard", "serial": "1190", "sku": "PY-1190", "status": "UNKNOWN" }
  ]
}
```

`status` is `BLOCKED` (an active recall covers this serial), `CLEAR` (model is known, no recall covers it), or `UNKNOWN` (model not in the registry).

Try it:

```bash
curl -s https://safestate.vercel.app/api/scan \
  -H 'content-type: application/json' \
  -d '{"items":[{"model":"DreamNest Bassinet","serial":"100"},{"model":"DreamNest Bassinet","serial":"5000"}]}'
```

## GET /api/scan/sample

Returns a small illustrative catalog (`{ "items": [...] }`) you can feed straight into `POST /api/scan`. Built server-side from the live demo model.

## POST /api/authorize-transfer

The transactional gate for a single sale. This runs the full Aurora DSQL transaction that records the transfer and writes the model's guard row, so a concurrent recall is forced to conflict. In production a marketplace maps its SKU to a SafeState instance id; in the demo, instance ids come from the seeded fixtures.

Request:

```json
{
  "instanceId": "33333333-3333-3333-3333-333333333333",
  "toOwnerId": "66666666-6666-6666-6666-666666666666",
  "idempotencyKey": "any-stable-string-per-attempt"
}
```

Response (blocked):

```json
{ "decision": "BLOCKED", "reason": "…", "remedy": "…", "source": "CPSC", "attempts": 1, "idempotent": false }
```

The `idempotencyKey` makes retries safe: the same key always returns the original decision and never double-applies a transfer.

## GET /api/recalls

The live feed of real recalls ingested daily from the public CPSC Recall API.

## GET /api/consistency/info

Reports the live multi-region topology (region A, region B, witness region, and the cluster endpoints) that backs the consistency guarantees.
