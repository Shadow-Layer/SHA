import { config } from "./config.mjs";
import { apiPatch, apiPost, assert, login, readState, writeState } from "./helpers.mjs";

export async function run(runner) {
  let verifiedStudentEmail;
  let verifiedStudentPassword;

  await runner.run("TC6: Preconditions", async () => {
    const state = readState();
    assert(
      state.verifiedStudentEmail && state.verifiedStudentPassword,
      "verifiedStudentEmail not found in state — tc04 must run first"
    );

    verifiedStudentEmail = state.verifiedStudentEmail;
    verifiedStudentPassword = state.verifiedStudentPassword;
  });

  if (!verifiedStudentEmail || !verifiedStudentPassword) {
    return;
  }

  await runner.run("TC6: Student withdraws application", async () => {
    const { applicationId } = readState();
    const studentJar = await login(config.BASE_URL, config.STUDENT_EMAIL, config.STUDENT_PASSWORD);
    const response = await apiPatch(
      config.BASE_URL,
      `/api/applications/${applicationId}`,
      { action: "withdraw" },
      studentJar
    );

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(response.body?.status === "withdrawn", `expected withdrawn, got ${response.body?.status}`);
  });

  await runner.run("TC6: Verified student creates separate pending application for TC9", async () => {
    const { listingId } = readState();
    const studentJar = await login(config.BASE_URL, verifiedStudentEmail, verifiedStudentPassword);
    const response = await apiPost(
      config.BASE_URL,
      `/api/listings/${listingId}/apply`,
      {
        moveInDate: "2025-01-20",
        occupancyPreference: "per_room",
        message: "Pending application for TC9 inbox flow.",
      },
      studentJar
    );

    assert(response.status === 201, `expected status 201, got ${response.status}`);
    assert(response.body?.status === "pending", `expected pending, got ${response.body?.status}`);
    assert(response.body?.id, "expected application id");

    writeState({ tc09ApplicationId: response.body.id });
  });
}
