import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getPool, isDsqlMode } from "../src/lib/db/pool";

/** Split a .sql file into individual statements.
 *  Aurora DSQL permits only ONE DDL statement per transaction, so we run
 *  each statement on its own (each pool.query is its own implicit txn).
 *  Naive ';' split is safe here — no semicolons appear inside literals. */
function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => {
      const withoutComments = s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim();
      return withoutComments.length > 0;
    });
}

async function main() {
  const dir = join(process.cwd(), "db", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pool = getPool();
  console.log(
    `Running ${files.length} migration file(s) against ${isDsqlMode() ? "Aurora DSQL" : "local Postgres"}…`,
  );

  for (const file of files) {
    const statements = splitStatements(readFileSync(join(dir, file), "utf8"));
    console.log(`\n${file} — ${statements.length} statement(s)`);
    for (const [i, stmt] of statements.entries()) {
      const label = stmt.replace(/\s+/g, " ").slice(0, 60);
      process.stdout.write(`  ${i + 1}. ${label}… `);
      await pool.query(stmt);
      console.log("ok");
    }
  }

  await pool.end();
  console.log("\nAll migrations applied.");
}

main().catch((err) => {
  console.error("\nMigration failed:", err);
  process.exit(1);
});
