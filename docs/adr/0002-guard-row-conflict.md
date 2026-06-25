# ADR-0002: Force write-write conflicts with a per-model guard row

- Status: Accepted
- Date: 2026-06-24

## Context

DSQL uses snapshot isolation with optimistic concurrency control. It detects write-write conflicts at commit time, but snapshot isolation does not prevent write skew: two transactions that touch different rows can both commit even when, together, they break an invariant.

In SafeState a recall and a sale of the same product naturally touch different rows. Without help, both could commit, and a unit that was just recalled could still be sold in the same instant.

## Decision

Give every product model a single `safety_guard` row that holds its safety status and an epoch counter. Both the recall path and the authorize-sale path write that row inside their transaction. This turns two logically conflicting operations into a real write-write conflict on the same row, which DSQL is guaranteed to detect.

When the conflict happens, one transaction commits and the other fails with `SQLSTATE 40001` (`OC000`). A retry wrapper re-runs the whole losing transaction with backoff and jitter. On retry it reads the now-recalled state and returns BLOCKED.

## Consequences

- The safety guarantee holds even under concurrent recall and sale of the same model.
- Every sale and recall writes one extra row, creating light write contention per model, which is acceptable for this workload.
- A retry-on-conflict wrapper is required and is used throughout. Conflicts are expected, not exceptional.
