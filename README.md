# SafeState

Recalls, made executable. SafeState turns a product recall from a notice into a rule that a sale has to pass. When a secondhand product is listed or bought, the marketplace checks SafeState, and a recalled unit is blocked at the moment of resale, down to the serial number, while safe units still sell.

Built for the H0: Hack the Zero Stack hackathon, on Amazon Aurora DSQL and Vercel.

- Live demo: https://safestate.vercel.app
- Architecture: [docs/architecture.md](docs/architecture.md)
- Design decisions: [docs/adr](docs/adr)

## The problem

A recall today is just information. It sits on a web page and waits to be read. On the secondhand market the buyer was never on any mailing list, so the recall and the sale never meet. SafeState makes them meet: at listing or checkout the marketplace asks whether this exact unit is safe to sell, and a recalled unit is blocked in real time.

## Architecture

```mermaid
flowchart LR
  Users["Marketplace and Manufacturer"]

  subgraph Vercel
    UI["Next.js UI"]
    API["API routes"]
    Cron["Daily Cron"]
  end

  subgraph DSQL["Amazon Aurora DSQL"]
    A["Region A (us-east-1)"]
    B["Region B (us-east-2)"]
  end

  CPSC["CPSC Recall API"]
  Claude["Claude"]
  DDB["Amazon DynamoDB (activity firehose)"]

  Users --> UI --> API
  API -->|"IAM token, Postgres"| A
  API -->|"IAM token, Postgres"| B
  A <-->|"active-active, strong consistency"| B
  API -->|"append-only events"| DDB
  Cron --> CPSC
  Cron --> API
  API -->|"match listings"| Claude
```

The full request flow and the concurrency guarantee are in [docs/architecture.md](docs/architecture.md).

## Why Aurora DSQL

The whole product rests on one promise: the instant a recall is committed in any region, no marketplace anywhere can read that product as safe again. That is a strong consistency problem. DSQL's active-active, multi-region design with strong reads closes the window where a recalled item would otherwise still look safe.

To make the guarantee hold under load, a recall and a sale of the same model are made to write the same guard row. DSQL uses optimistic concurrency, so the two transactions collide, one wins, and the loser retries on `SQLSTATE 40001`, reads the recalled state, and blocks the sale. A recalled unit never slips through. See [ADR-0002](docs/adr/0002-guard-row-conflict.md).

DSQL was chosen over Aurora PostgreSQL and DynamoDB deliberately, because it is the only one of the three with multi-region, active-active strong consistency. The reasoning is in [ADR-0007](docs/adr/0007-why-dsql-over-alternatives.md).

A marketplace can check a single sale at the gate, or scan its entire catalog for recall exposure in one call. The integration surface is documented in [docs/api.md](docs/api.md).

## Two databases, on purpose

Aurora DSQL is the primary database and owns every transactional safety decision. DynamoDB owns the high-volume, append-only activity firehose (checks, verifies, scans, decisions) and the live counters, a workload that does not need a distributed transaction. Right tool per workload. See [ADR-0008](docs/adr/0008-dynamodb-activity-firehose.md).

## Tech stack

- Next.js (App Router) on Vercel
- Amazon Aurora DSQL, multi-region (us-east-1, us-east-2, witness us-west-2) — transactional core
- Amazon DynamoDB — append-only activity firehose and counters
- node-postgres with IAM token auth (`@aws-sdk/dsql-signer`)
- Vercel Cron for daily CPSC ingestion
- Claude for listing-to-recall matching
- TypeScript and Tailwind CSS

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Set the database connection using the variables in `.env.example`. Local development uses your default AWS credential chain, see [ADR-0003](docs/adr/0003-iam-token-auth.md) and [ADR-0004](docs/adr/0004-vercel-credential-naming.md).

## Tests

```bash
npm test
```

## Documentation

- [docs/architecture.md](docs/architecture.md) covers how the pieces fit and the concurrency guarantee.
- [docs/api.md](docs/api.md) is the integration surface: the catalog scan and the single-unit gate.
- [docs/adr](docs/adr) records the key design decisions and why they were made.

---

Built for the H0: Hack the Zero Stack hackathon.
