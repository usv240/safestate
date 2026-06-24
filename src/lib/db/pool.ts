import { Pool, type PoolConfig } from "pg";
import { DsqlSigner } from "@aws-sdk/dsql-signer";

/**
 * Dual-mode, multi-region Postgres pools.
 *  - DSQL mode (prod): DSQL_ENDPOINT is the primary (Region A) endpoint;
 *    DSQL_ENDPOINT_REGION_B is the peer (Region B). Both present ONE logical,
 *    strongly-consistent database. Auth uses short-lived IAM tokens.
 *  - Local mode (dev): falls back to DATABASE_URL (single pool).
 *
 * Credentials: on Vercel/Lambda the AWS_* env vars are reserved and cannot be
 * set, so we read SAFESTATE_AWS_* and pass them explicitly to the signer.
 * Locally (no SAFESTATE_AWS_*), the default AWS provider chain (`aws configure`)
 * is used. Regions likewise prefer SAFESTATE_DSQL_REGION_* then AWS_REGION*.
 */

let poolA: Pool | undefined;
let poolB: Pool | undefined;

function explicitCreds() {
  const accessKeyId = process.env.SAFESTATE_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SAFESTATE_AWS_SECRET_ACCESS_KEY;
  if (accessKeyId && secretAccessKey) return { accessKeyId, secretAccessKey };
  return undefined; // fall back to the default AWS provider chain (local dev)
}

function regionA(): string {
  return process.env.SAFESTATE_DSQL_REGION_A || process.env.AWS_REGION || "us-east-1";
}
function regionB(): string {
  return process.env.SAFESTATE_DSQL_REGION_B || process.env.AWS_REGION_B || "us-east-2";
}

function dsqlConfig(hostname: string, region: string): PoolConfig {
  const user = process.env.DSQL_USER || "admin";
  const signer = new DsqlSigner({ hostname, region, credentials: explicitCreds() });
  return {
    host: hostname,
    port: 5432,
    user,
    database: process.env.DSQL_DATABASE || "postgres",
    ssl: { rejectUnauthorized: true },
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

/** Primary pool (Region A in DSQL mode, or local Postgres). */
export function getPool(): Pool {
  if (!poolA) {
    poolA = new Pool(
      process.env.DSQL_ENDPOINT ? dsqlConfig(process.env.DSQL_ENDPOINT, regionA()) : localConfig(),
    );
  }
  return poolA;
}

/** Region-B pool — only available when a peer endpoint is configured. */
export function getPoolB(): Pool | null {
  const endpoint = process.env.DSQL_ENDPOINT_REGION_B;
  if (!endpoint) return null;
  if (!poolB) {
    poolB = new Pool(dsqlConfig(endpoint, regionB()));
  }
  return poolB;
}

export function isDsqlMode(): boolean {
  return Boolean(process.env.DSQL_ENDPOINT);
}

export function regionInfo() {
  return {
    regionA: isDsqlMode() ? regionA() : "local",
    regionB: process.env.DSQL_ENDPOINT_REGION_B ? regionB() : null,
    multiRegion: Boolean(process.env.DSQL_ENDPOINT_REGION_B),
  };
}
