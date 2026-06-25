# ADR-0001: Use Amazon Aurora DSQL as the primary database

- Status: Accepted
- Date: 2026-06-24

## Context

SafeState's core promise is that the instant a recall is committed, no region can read the affected product as safe. Any window where a recalled product still looks safe is exactly the moment it gets sold. An eventually consistent store or a nightly sync leaves that window open.

The hackathon also requires one of three AWS databases as the primary backend: Amazon Aurora, Amazon Aurora DSQL, or Amazon DynamoDB.

## Decision

Use Amazon Aurora DSQL as the primary database, running as a multi-region, active-active cluster in us-east-1 and us-east-2 with a witness in us-west-2.

DSQL gives strong, cross-region reads. A recall written through one region is immediately visible from the other, which is the exact guarantee the product depends on. It speaks the Postgres protocol, so node-postgres and standard SQL work with little friction.

## Consequences

- The central correctness guarantee is met by the database, not by application polling or caching.
- DSQL uses snapshot isolation rather than serializable isolation, which shapes how conflicts are handled. See [ADR-0002](0002-guard-row-conflict.md).
- DSQL has no sequences and no foreign keys, which shapes the schema. See [ADR-0005](0005-uuids-no-foreign-keys.md).
- Authentication is by IAM token rather than password. See [ADR-0003](0003-iam-token-auth.md).
