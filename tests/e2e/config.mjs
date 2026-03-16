import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const read = (key, fallback = "") => process.env[key] ?? fallback;

export const config = Object.freeze({
  BASE_URL: read("BASE_URL"),
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
