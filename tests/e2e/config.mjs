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
  BASE_URL: read("BASE_URL", "https://main.d3ppbkoectwrsc.amplifyapp.com"),
  LANDLORD_EMAIL: read("LANDLORD_EMAIL"),
  LANDLORD_PASSWORD: read("LANDLORD_PASSWORD"),
  STUDENT_EMAIL: read("STUDENT_EMAIL"),
  STUDENT_PASSWORD: read("STUDENT_PASSWORD"),
  STUDENT_VERIFIED_EMAIL: read("STUDENT_VERIFIED_EMAIL"),
  STUDENT_VERIFIED_PASSWORD: read("STUDENT_VERIFIED_PASSWORD"),
  ADMIN_EMAIL: read("ADMIN_EMAIL"),
  ADMIN_PASSWORD: read("ADMIN_PASSWORD"),
  FORUM_CATEGORY: "general",
});

const requiredCredentialKeys = [
  "LANDLORD_EMAIL",
  "LANDLORD_PASSWORD",
  "STUDENT_EMAIL",
  "STUDENT_PASSWORD",
  "STUDENT_VERIFIED_EMAIL",
  "STUDENT_VERIFIED_PASSWORD",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];

const missingCredentialKeys = requiredCredentialKeys.filter((key) => !config[key]);

if (missingCredentialKeys.length > 0) {
  const relativePath = (targetPath) => path.relative(rootDir, targetPath) || ".";

  throw new Error(
    [
      `Missing required E2E credentials: ${missingCredentialKeys.join(", ")}`,
      "",
      "Provide real test accounts in one of these files:",
      `- ${relativePath(defaultEnvFile)}`,
      `- ${relativePath(dedicatedE2eEnvFile)} (recommended for E2E-only secrets)`,
      "",
      `You can start from ${relativePath(path.join(rootDir, "tests/e2e/env.example"))}.`,
      "Optional: set E2E_ENV_FILE to point at a different env file.",
    ].join("\n")
  );
}
