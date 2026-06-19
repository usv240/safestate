import "dotenv/config";
import { getPool } from "../src/lib/db/pool";
import { seedDemo } from "../src/lib/demo/seed";

async function main() {
  await seedDemo();
  console.log("Seeded demo fixtures (manufacturer, model, guard, 2 instances).");
  await getPool().end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
