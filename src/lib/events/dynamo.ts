import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

/**
 * The high-volume activity firehose. Aurora DSQL owns every transactional safety
 * decision, where strong cross-region consistency is the product. This layer is
 * the opposite workload: append-only, write-heavy, key-accessed telemetry of who
 * checked what, which does not need a distributed transaction. That is a textbook
 * fit for DynamoDB. See docs/adr/0008.
 */

const TABLE = process.env.SAFESTATE_DDB_TABLE || "safestate_events";
const REGION = process.env.SAFESTATE_DDB_REGION || "us-east-1";

function explicitCreds() {
  const accessKeyId = process.env.SAFESTATE_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SAFESTATE_AWS_SECRET_ACCESS_KEY;
  if (accessKeyId && secretAccessKey) return { accessKeyId, secretAccessKey };
  return undefined; // local dev: default AWS provider chain
}

let doc: DynamoDBDocumentClient | undefined;
function getDoc(): DynamoDBDocumentClient {
  if (!doc) {
    const creds = explicitCreds();
    const client = new DynamoDBClient(creds ? { region: REGION, credentials: creds } : { region: REGION });
    doc = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
  }
  return doc;
}

export type EventKind = "check" | "verify" | "scan" | "authorize" | "recall";

/** Append an event and bump counters. Best-effort: never throws, never blocks
 *  the core safety decision. */
export async function recordEvent(kind: EventKind, label: string): Promise<void> {
  try {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const ttl = Math.floor(now.getTime() / 1000) + 60 * 60 * 24 * 30; // self-prune after 30 days
    const d = getDoc();
    await Promise.all([
      d.send(
        new PutCommand({
          TableName: TABLE,
          Item: {
            pk: `EVT#${day}`,
            sk: `${now.toISOString()}#${randomUUID().slice(0, 8)}`,
            kind,
            label: (label || "").slice(0, 120),
            ts: now.toISOString(),
            ttl,
          },
        }),
      ),
      d.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { pk: "STAT", sk: "TOTAL" },
          UpdateExpression: "ADD #k :one, #t :one",
          ExpressionAttributeNames: { "#k": kind, "#t": "total" },
          ExpressionAttributeValues: { ":one": 1 },
        }),
      ),
    ]);
  } catch {
    /* telemetry is best-effort; swallow */
  }
}

/** Cheap reachability check for the health indicator. */
export async function pingDynamo(): Promise<boolean> {
  try {
    await getDoc().send(new GetCommand({ TableName: TABLE, Key: { pk: "STAT", sk: "TOTAL" } }));
    return true;
  } catch {
    return false;
  }
}

export interface ActivityStats {
  total: number;
  check: number;
  verify: number;
  scan: number;
  authorize: number;
  recall: number;
}

export async function getActivity(): Promise<{
  stats: ActivityStats;
  recent: { kind: string; label: string; ts: string }[];
}> {
  const empty: ActivityStats = { total: 0, check: 0, verify: 0, scan: 0, authorize: 0, recall: 0 };
  try {
    const d = getDoc();
    const day = new Date().toISOString().slice(0, 10);
    const [statRes, recentRes] = await Promise.all([
      d.send(new GetCommand({ TableName: TABLE, Key: { pk: "STAT", sk: "TOTAL" } })),
      d.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: "pk = :p",
          ExpressionAttributeValues: { ":p": `EVT#${day}` },
          ScanIndexForward: false,
          Limit: 8,
        }),
      ),
    ]);
    const s = statRes.Item ?? {};
    const stats: ActivityStats = {
      total: Number(s.total ?? 0),
      check: Number(s.check ?? 0),
      verify: Number(s.verify ?? 0),
      scan: Number(s.scan ?? 0),
      authorize: Number(s.authorize ?? 0),
      recall: Number(s.recall ?? 0),
    };
    const recent = (recentRes.Items ?? []).map((i) => ({
      kind: String(i.kind),
      label: String(i.label ?? ""),
      ts: String(i.ts),
    }));
    return { stats, recent };
  } catch {
    return { stats: empty, recent: [] };
  }
}
