import "dotenv/config";
import { getPool } from "../src/lib/db/pool";
import { seedDemo } from "../src/lib/demo/seed";
import { seedContent } from "../src/lib/demo/seedContent";

async function main() {
  await seedContent();
  console.log("Seeded backend content (copy, help topics, tutorial steps).");
  await seedDemo();
  console.log("Seeded demo fixtures (manufacturer, model, guard, 2 instances).");
  await getPool().end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
