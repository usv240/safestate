# Architecture Decision Records

These records capture the decisions that shaped SafeState and why they were made. Each one is short: the context, the decision, and the consequences. The format is based on Michael Nygard's ADR template.

| ADR | Decision |
| --- | --- |
| [0001](0001-use-aurora-dsql.md) | Use Amazon Aurora DSQL as the primary database |
| [0002](0002-guard-row-conflict.md) | Force write-write conflicts with a per-model guard row |
| [0003](0003-iam-token-auth.md) | Authenticate to the database with short-lived IAM tokens |
| [0004](0004-vercel-credential-naming.md) | Pass AWS credentials under custom names on Vercel |
| [0005](0005-uuids-no-foreign-keys.md) | Use client-generated UUIDs and app-enforced relationships |
| [0006](0006-ai-matching-with-review.md) | Match listings with AI, with a human review queue |
| [0007](0007-why-dsql-over-alternatives.md) | Choose Aurora DSQL over Aurora PostgreSQL and DynamoDB |
