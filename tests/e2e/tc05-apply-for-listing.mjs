import { config } from "./config.mjs";
import { apiPost, assert, login, readState, writeState } from "./helpers.mjs";

export async function run(runner) {
  await runner.run("TC5: Student applies for accommodation", async () => {
    const { listingId, tenantEmail, password } = readState();
    const studentJar = await login(config.BASE_URL, tenantEmail, password);
    const response = await apiPost(
      config.BASE_URL,
      `/api/listings/${listingId}/apply`,
      {
        moveInDate: "2025-01-15",
        occupancyPreference: "per_room",
        message: "Interested in this accommodation.",
      },
      studentJar
    );

    assert(response.status === 201, `expected status 201, got ${response.status}`);
    assert(response.body?.status === "pending", `expected pending, got ${response.body?.status}`);
    assert(response.body?.id, "expected application id");

    writeState({ applicationId: response.body.id });
  });
}
