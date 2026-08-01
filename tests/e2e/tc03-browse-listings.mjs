import { config } from "./config.mjs";
import { apiGet, assert, readState } from "./helpers.mjs";

export async function run(runner) {
  const { listingArea, listingId } = readState();

  await runner.run("TC3: Public listings endpoint returns listings array", async () => {
    const response = await apiGet(config.BASE_URL, "/api/listings");
    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(Array.isArray(response.body?.listings), "expected listings array");
  });

  await runner.run("TC3: Area filter matches requested area", async () => {
    const response = await apiGet(
      config.BASE_URL,
      `/api/listings?area=${encodeURIComponent(listingArea)}`
    );

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(response.body.listings.length > 0, "expected at least one listing for area filter");
    assert(
      response.body.listings.every((listing) => listing.area === listingArea),
      "expected all listings to match area filter"
    );
  });

  await runner.run("TC3: maxRent filter caps occupancy option rent", async () => {
    const response = await apiGet(config.BASE_URL, "/api/listings?maxRent=100");

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(response.body.listings.length > 0, "expected at least one listing for maxRent filter");
    assert(
      response.body.listings.every((listing) =>
        Array.isArray(listing.occupancyOptions) &&
        listing.occupancyOptions.some((option) => Number(option.rent) <= 100)
      ),
      "expected at least one occupancy option at or below maxRent"
    );
  });

  await runner.run("TC3: occupancyType filter matches per_room", async () => {
    const response = await apiGet(config.BASE_URL, "/api/listings?occupancyType=per_room");

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(
      response.body.listings.length > 0,
      "expected at least one listing for occupancyType filter"
    );
    assert(
      response.body.listings.every((listing) =>
        Array.isArray(listing.occupancyOptions) &&
        listing.occupancyOptions.some((option) => option.occupancyType === "per_room")
      ),
      "expected occupancyType filter to return per_room listings"
    );
  });

  await runner.run("TC3: amenities filter matches backup_power", async () => {
    const response = await apiGet(config.BASE_URL, "/api/listings?amenities=backup_power");

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(response.body.listings.length > 0, "expected at least one listing for amenities filter");
    assert(
      response.body.listings.every(
        (listing) =>
          Array.isArray(listing.amenities) && listing.amenities.includes("backup_power")
      ),
      "expected all listings to include backup_power amenity"
    );
  });

  await runner.run("TC3: listing detail returns full listing payload", async () => {
    const response = await apiGet(config.BASE_URL, `/api/listings/${listingId}`);

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(response.body?.title, "expected listing title");
    assert(response.body?.area, "expected listing area");
    assert(Array.isArray(response.body?.occupancyOptions), "expected occupancyOptions array");
    assert(Array.isArray(response.body?.amenities), "expected amenities array");
    assert(response.body.amenities.includes("backup_power"), "expected canonical backup_power amenity");
  });
}
