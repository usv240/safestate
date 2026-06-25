# ADR-0004: Pass AWS credentials under custom names on Vercel

- Status: Accepted
- Date: 2026-06-24

## Context

Signing an IAM auth token (see [ADR-0003](0003-iam-token-auth.md)) needs AWS credentials available to the function. Vercel functions run on AWS Lambda, and Lambda reserves `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` for its own execution role. Setting those names as project environment variables does not work.

## Decision

Provide the credentials under custom names, `SAFESTATE_AWS_ACCESS_KEY_ID` and `SAFESTATE_AWS_SECRET_ACCESS_KEY`, and pass them to the signer explicitly when they are present. When they are absent, fall back to the default AWS provider chain, which is what local development uses.

## Consequences

- The same code runs on Vercel and locally without changes.
- There is one layer of indirection in configuration, documented in `.env.example`.
- The credentials handed to the signer are scoped to least privilege for DSQL connect and the tables the app uses.
