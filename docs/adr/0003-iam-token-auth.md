# ADR-0003: Authenticate to the database with short-lived IAM tokens

- Status: Accepted
- Date: 2026-06-24

## Context

The app connects to the database from serverless functions. Storing a long-lived database password in an environment variable is a standing risk: it can leak, and it has to be rotated by hand.

Aurora DSQL supports IAM authentication, where a connection presents a short-lived token instead of a password.

## Decision

Mint a short-lived IAM auth token per connection with `@aws-sdk/dsql-signer`, and supply it to node-postgres through an async password provider. There is no database password stored anywhere.

## Consequences

- No password lives at rest in the codebase, in Vercel, or in local config.
- Tokens are short-lived, so the connection pool uses an async password provider that fetches a fresh token when needed.
- The function needs AWS credentials available to sign the token. On Vercel this needs custom handling. See [ADR-0004](0004-vercel-credential-naming.md).
