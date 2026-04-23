import { ensureBaseUrlReachable, makeTestRunner, resetState, writeState } from "./helpers.mjs";
import { config } from "./config.mjs";
import { run as runTc01 } from "./tc01-landlord-register.mjs";
import { run as runTc02 } from "./tc02-create-listing.mjs";
import { run as runTc03 } from "./tc03-browse-listings.mjs";
import { run as runTc04 } from "./tc04-student-register.mjs";
import { run as runTc05 } from "./tc05-apply-for-listing.mjs";
import { run as runTc06 } from "./tc06-withdraw-application.mjs";
import { run as runTc06b } from "./tc06b-reject-application.mjs";
import { run as runTc07 } from "./tc07-verify-listing.mjs";
import { run as runTc08 } from "./tc08-forum.mjs";
import { run as runTc09 } from "./tc09-inbox-messaging.mjs";
import { run as runTc10 } from "./tc10-notifications.mjs";

const now = Date.now();

resetState({
  landlordEmail: `landlord_${now}@test.creapy.com`,
  tenantEmail: `tenant_${now}@test.creapy.com`,
  verifiedStudentEmail: null,
  verifiedStudentPassword: null,
  landlordToken: null,
  landlordId: null,
  tenantToken: null,
  tenantId: null,
  listingId: null,
  listingFeeRef: null,
  tenantPremiumRef: null,
  password: "TestPass123!",
});

await ensureBaseUrlReachable(config.BASE_URL);

async function seedDatabase() {
  let response;
  let data;

  try {
    response = await fetch(`${config.BASE_URL}/api/seed`, {
      method: "POST",
      headers: {
        "x-seed-secret": config.SEED_SECRET,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`E2E_ABORT: Seed request failed: ${message}`);
    process.exit(1);
  }

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.status !== 200) {
    console.error(`E2E_ABORT: Seed failed [${response.status}]: ${JSON.stringify(data)}`);
    process.exit(1);
  }

  if (!data?.adminCredentials?.email || !data?.adminCredentials?.password) {
    console.error(`E2E_ABORT: Seed response missing admin credentials: ${JSON.stringify(data)}`);
    process.exit(1);
  }

  writeState({
    adminEmail: data.adminCredentials.email,
    adminPassword: data.adminCredentials.password,
  });

  console.log("Seed OK — database reset.");
}

await seedDatabase();

const runner = makeTestRunner();

await runTc01(runner);
await runTc02(runner);
await runTc03(runner);
await runTc04(runner);
await runTc05(runner);
await runTc06(runner);
await runTc06b(runner);
await runTc07(runner);
await runTc08(runner);
await runTc09(runner);
await runTc10(runner);

process.exit(runner.summarize());
