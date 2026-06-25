import { test } from "node:test";
import assert from "node:assert/strict";
import { serialCovered } from "../src/lib/safety/authorizeTransfer";
import { isRetryableConflict } from "../src/lib/db/retry";
import { decide } from "../src/lib/ai/match";

// Minimal directive-target row builder (serialCovered only reads scope + range).
const row = (scope: string, lo: string | null = null, hi: string | null = null) =>
  ({ id: "x", kind: "RECALL", hazard: null, remedy: null, source: null, scope, range_lo: lo, range_hi: hi }) as Parameters<typeof serialCovered>[1];

test("serialCovered: MODEL scope covers every unit", () => {
  assert.equal(serialCovered("100", row("MODEL")), true);
  assert.equal(serialCovered(null, row("MODEL")), true);
});

test("serialCovered: SERIAL_RANGE is inclusive and numeric", () => {
  const r = row("SERIAL_RANGE", "1", "999");
  assert.equal(serialCovered("1", r), true);
  assert.equal(serialCovered("100", r), true);
  assert.equal(serialCovered("999", r), true);
  assert.equal(serialCovered("1000", r), false);
  assert.equal(serialCovered("5000", r), false);
  assert.equal(serialCovered(null, r), false);
});

test("serialCovered: UNIT matches one exact serial", () => {
  const r = row("UNIT", "100");
  assert.equal(serialCovered("100", r), true);
  assert.equal(serialCovered("101", r), false);
});

test("isRetryableConflict: DSQL OCC codes are retryable, others are not", () => {
  assert.equal(isRetryableConflict({ code: "40001" }), true);
  assert.equal(isRetryableConflict({ code: "OC000" }), true);
  assert.equal(isRetryableConflict({ code: "OC001" }), true);
  assert.equal(isRetryableConflict({ code: "23505" }), false); // unique_violation
  assert.equal(isRetryableConflict({}), false);
  assert.equal(isRetryableConflict(new Error("boom")), false);
});

test("decide: confidence thresholds map to MATCH / REVIEW / CLEAR", () => {
  assert.equal(decide(0.92), "MATCH");
  assert.equal(decide(0.75), "MATCH");
  assert.equal(decide(0.74), "REVIEW");
  assert.equal(decide(0.4), "REVIEW");
  assert.equal(decide(0.39), "CLEAR");
  assert.equal(decide(0), "CLEAR");
});
