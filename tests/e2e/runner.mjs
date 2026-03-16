import dotenv from "dotenv";
import { makeTestRunner } from "./helpers.mjs";
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

dotenv.config({ path: ".env.local" });

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
