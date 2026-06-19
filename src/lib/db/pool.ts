import { Pool, type PoolConfig } from "pg";
import { DsqlSigner } from "@aws-sdk/dsql-signer";

/**
 * Dual-mode Postgres pool.
 *  - DSQL mode (prod): set DSQL_ENDPOINT. Auth uses short-lived IAM tokens
 *    minted by DsqlSigner; pg calls the async `password` provider per new
 *    connection, so tokens stay fresh without manual rotation.
 *  - Local mode (dev): falls back to DATABASE_URL. Aurora DSQL is
 *    PostgreSQL-wire-compatible, so the same app code runs against both.
 */

let pool: Pool | undefined;

function usingDsql(): boolean {
  return Boolean(process.env.DSQL_ENDPOINT);
}

function dsqlConfig(): PoolConfig {
  const hostname = process.env.DSQL_ENDPOINT!;
  const region = process.env.AWS_REGION || "us-east-1";
  const user = process.env.DSQL_USER || "admin";
  const signer = new DsqlSigner({ hostname, region });

  return {
    host: hostname,
    port: 5432,
    user,
    database: process.env.DSQL_DATABASE || "postgres",
    ssl: { rejectUnauthorized: true },
    // pg accepts an async password provider — invoked on each new connection.
    password: async () =>
      user === "admin"
        ? await signer.getDbConnectAdminAuthToken()
        : await signer.getDbConnectAuthToken(),
    max: Number(process.env.DB_POOL_MAX || 5),
    idleTimeoutMillis: 30_000,
  };
}

function localConfig(): PoolConfig {
  return {
    connectionString:
      process.env.DATABASE_URL ||
      "postgres://postgres:postgres@localhost:5432/safestate",
    max: Number(process.env.DB_POOL_MAX || 5),
  };
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(usingDsql() ? dsqlConfig() : localConfig());
  }
  return pool;
}

export function isDsqlMode(): boolean {
  return usingDsql();
}
