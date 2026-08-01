import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const read = (key, fallback = "") => process.env[key] ?? fallback;

export const config = Object.freeze({
  BASE_URL: read("BASE_URL", read("NEXTAUTH_URL", "")),
  FORUM_CATEGORY: "general",
  SEED_SECRET: read("SEED_SECRET", ""),
});

if (!config.BASE_URL) {
  console.error("E2E_ABORT: BASE_URL or NEXTAUTH_URL env var is required but not set.");
  process.exit(1);
}

if (!config.SEED_SECRET) {
  console.error("E2E_ABORT: SEED_SECRET env var is required but not set.");
  process.exit(1);
}
