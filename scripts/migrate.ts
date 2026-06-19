import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getPool, isDsqlMode } from "../src/lib/db/pool";

async function main() {
  const dir = join(process.cwd(), "db", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pool = getPool();
  console.log(`Running ${files.length} migration(s) against ${isDsqlMode() ? "Aurora DSQL" : "local Postgres"}…`);

  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8");
    process.stdout.write(`  • ${file} … `);
    await pool.query(sql);
    console.log("ok");
  }

  await pool.end();
  console.log("All migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
