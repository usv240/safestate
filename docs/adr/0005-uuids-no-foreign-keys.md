# ADR-0005: Use client-generated UUIDs and app-enforced relationships

- Status: Accepted
- Date: 2026-06-24

## Context

Aurora DSQL does not support auto-increment sequences (`SERIAL`) or foreign key constraints. The schema and the application have to account for both.

## Decision

Generate primary keys as UUIDs in application code rather than relying on the database to assign them. Enforce relationships and referential integrity in the application layer instead of with foreign keys.

## Consequences

- IDs are known before insert, which makes inserts idempotent and avoids a round trip to read a generated key.
- There is no database-level foreign key enforcement, so the application is responsible for keeping references valid.
- The data model stays portable and avoids any dependency on sequence behavior.
