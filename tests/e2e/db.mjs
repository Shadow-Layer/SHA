import { config } from "./config.mjs";
import { apiPatch, login, readState } from "./helpers.mjs";

export async function publishListing(listingId) {
  const { adminEmail, adminPassword } = readState();
  if (!adminEmail || !adminPassword) {
    throw new Error("Admin credentials not found in state — seed must run first");
  }

  const adminJar = await login(config.BASE_URL, adminEmail, adminPassword);
  const response = await apiPatch(
    config.BASE_URL,
    `/api/admin/listings/${listingId}`,
    { action: "approve" },
    adminJar
  );

  if (response.status !== 200) {
    throw new Error(`publishListing failed [${response.status}]: ${JSON.stringify(response.body)}`);
  }

  return { status: "published" };
}
