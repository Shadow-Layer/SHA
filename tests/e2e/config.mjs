import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({
  path: path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../.env.local"),
});

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
  throw new Error(
    `Missing required E2E credentials: ${missingCredentialKeys.join(", ")} - set them in .env.local`
  );
}
