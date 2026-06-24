import "dotenv/config";
import { getPool } from "../src/lib/db/pool";
import { ingestCpsc } from "../src/lib/cpsc/ingest";

async function main() {
  console.log("Ingesting nursery recalls from the CPSC Recall API…");
  const { count } = await ingestCpsc(Number(process.env.CPSC_LIMIT ?? 24));
  console.log(`Ingested ${count} CPSC recall(s).`);
  await getPool().end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
