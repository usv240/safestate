# ADR-0007: Choose Aurora DSQL over Aurora PostgreSQL and DynamoDB

- Status: Accepted
- Date: 2026-06-24

## Context

The hackathon allows three databases: Amazon Aurora (PostgreSQL), Amazon Aurora DSQL, or Amazon DynamoDB. SafeState's correctness rests on a single invariant: the instant a recall commits in any region, no marketplace in any region may read the product as safe. Meeting that needs strong, multi-region consistency, plus a transaction that can check recall state and record a sale atomically and detect the conflict when a recall and a sale race.

## Options considered

- **Amazon DynamoDB.** Reads are eventually consistent by default. Strongly consistent reads exist but only within a single region. Global Tables give multi-region, multi-active writes with last-writer-wins and eventual cross-region convergence. That convergence gap is exactly the stale-safe window SafeState cannot allow, so the core invariant cannot be met across regions.

- **Amazon Aurora (PostgreSQL).** Strong single-region consistency and full SQL, including serializable isolation. But a cluster has one writer region; Aurora Global Database adds cross-region read replicas that are read-only and lag the primary. A recall committed in the primary region is therefore not immediately enforceable in another region's reads, and writes funnel through one region.

- **Amazon Aurora DSQL.** Active-active across regions with strong consistency. Writes can happen in any region, and reads anywhere reflect committed state immediately. Optimistic concurrency surfaces write-write conflicts at commit time. This matches the invariant directly.

## Decision

Use Aurora DSQL. Of the three, it is the only one that provides multi-region, active-active strong consistency, which is the literal definition of SafeState's guarantee.

## Consequences

- The guarantee is met by the database across regions, not approximated in application code or background jobs.
- We accept DSQL's trade-offs: snapshot isolation rather than serializable (see [ADR-0002](0002-guard-row-conflict.md)), no sequences or foreign keys (see [ADR-0005](0005-uuids-no-foreign-keys.md)), and one DDL statement per transaction.
- If SafeState only ever ran in a single region, Aurora PostgreSQL would also be viable. It is the multi-region requirement that makes DSQL the deliberate, rather than incidental, choice.
