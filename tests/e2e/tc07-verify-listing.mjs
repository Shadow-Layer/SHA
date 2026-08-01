import { config } from "./config.mjs";
import { apiPost, assert, login, readState } from "./helpers.mjs";

export async function run(runner) {
  await runner.run("TC7: Student verifies listing once", async () => {
    const { listingId, tenantEmail, password } = readState();
    const studentJar = await login(config.BASE_URL, tenantEmail, password);
    const response = await apiPost(
      config.BASE_URL,
      `/api/listings/${listingId}/verify`,
      { type: "seen" },
      studentJar
    );

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(
      Number(response.body?.confirmationCount) >= 1,
      "expected confirmationCount to be at least 1"
    );
  });

  await runner.run("TC7: Duplicate listing verification is blocked", async () => {
    const { listingId, tenantEmail, password } = readState();
    const studentJar = await login(config.BASE_URL, tenantEmail, password);
    const response = await apiPost(
      config.BASE_URL,
      `/api/listings/${listingId}/verify`,
      { type: "seen" },
      studentJar
    );

    assert(response.status === 409, `expected status 409, got ${response.status}`);
    assert(
      response.body?.error === "You already verified this listing.",
      `expected duplicate verification message, got ${response.body?.error}`
    );
  });
}
