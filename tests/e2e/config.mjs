import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const defaultEnvFile = path.join(rootDir, ".env.local");
const dedicatedE2eEnvFile = path.join(rootDir, ".env.e2e.local");
const configuredEnvFile = process.env.E2E_ENV_FILE
  ? path.resolve(rootDir, process.env.E2E_ENV_FILE)
  : null;

for (const envFile of [defaultEnvFile, dedicatedE2eEnvFile, configuredEnvFile]) {
  if (!envFile) continue;

  dotenv.config({ path: envFile, override: false });
}

const read = (key, fallback = "") => process.env[key] ?? fallback;

export const config = Object.freeze({
  BASE_URL: read("BASE_URL", read("NEXTAUTH_URL", "https://main.d3ppbkoectwrsc.amplifyapp.com")),
  FORUM_CATEGORY: "general",
});
