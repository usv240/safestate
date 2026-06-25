# ADR-0008: Add DynamoDB for the activity firehose (polyglot persistence)

- Status: Accepted
- Date: 2026-06-25

## Context

Aurora DSQL is the primary database and owns every transactional safety decision, where strong cross-region consistency is the product (see [ADR-0001](0001-use-aurora-dsql.md) and [ADR-0002](0002-guard-row-conflict.md)).

A second, very different workload also exists: a high-volume, append-only stream of activity. Every public recall check, every Safe Handoff verify, every catalog scan, plus gate decisions and issued recalls, is an event worth recording for counters and a live feed. This stream is write-heavy, key-accessed, and does not need a distributed transaction or cross-region serializability. Pushing it through the transactional core would add write contention to the guard rows and cost, for no benefit.

## Decision

Use Amazon DynamoDB for the activity firehose, alongside Aurora DSQL. A single on-demand table (`safestate_events`) holds append-only events, partitioned by day and sorted by timestamp with a 30-day TTL, plus atomic counter items. Writes are best-effort: they are wrapped so they never block or fail a safety decision.

This is deliberate polyglot persistence. The transactional core stays on DSQL; the telemetry firehose goes to DynamoDB; each sits on the database that fits its workload.

## Consequences

- Shows picking the right database per workload rather than one database for everything. This complements [ADR-0007](0007-why-dsql-over-alternatives.md) rather than contradicting it: DSQL is still primary and still the only place strong consistency lives.
- Adds the AWS SDK DynamoDB client and a scoped IAM policy on the app user (`PutItem`, `UpdateItem`, `GetItem`, `Query` on the one table only).
- Activity writes are fire-and-forget. If DynamoDB is unavailable, the safety decision is unaffected and the counters simply do not advance.
- The live "recall checks run" counter and the recent-activity feed are served from DynamoDB, not from the transactional store.
