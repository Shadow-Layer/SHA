import { config } from "./config.mjs";
import { publishListing } from "./db.mjs";
import { apiGet, apiPost, assert, login, readState, writeState } from "./helpers.mjs";

export async function run(runner) {
  const area = `E2E Area ${Date.now()}`;
  const listingPayload = {
    title: `E2E Listing ${Date.now()}`,
    area,
    landmark: "Near campus gate",
    occupancyOptions: [
      {
        occupancyType: "per_room",
        rooms: 1,
        bathrooms: 1,
        rent: 95,
      },
    ],
    amenities: ["wifi", "borehole", "backup_power"],
    regulations: ["No smoking"],
    photos: [],
  };

  await runner.run("TC2: Landlord creates listing", async () => {
    const { landlordEmail, password } = readState();
    const landlordJar = await login(config.BASE_URL, landlordEmail, password);
    const response = await apiPost(config.BASE_URL, "/api/listings", listingPayload, landlordJar);

    assert(response.status === 201, `expected status 201, got ${response.status}`);
    assert(response.body?.id, "expected listing id in create listing response");
    assert(
      response.body?.status === "pending_review",
      `expected pending_review, got ${response.body?.status}`
    );

    writeState({ listingId: response.body.id, listingArea: area });
  });

  await runner.run("TC2: E2E publish step marks listing as published", async () => {
    const { listingId } = readState();
    const listing = await publishListing(listingId);
    assert(listing.status === "published", `expected published, got ${listing.status}`);
  });

  await runner.run("TC2: Published listing is visible via listing detail", async () => {
    const { listingId } = readState();
    const response = await apiGet(config.BASE_URL, `/api/listings/${listingId}`);

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(response.body?.status === "published", `expected published, got ${response.body?.status}`);
  });
}
