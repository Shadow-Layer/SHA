import { config } from "./config.mjs";
import { apiGet, apiPatch, apiPost, assert, login, readState } from "./helpers.mjs";

export async function run(runner) {
  const { listingId } = readState();
  const rejectFlowStudentEmail = `reject.${Date.now()}@example.com`;
  const rejectFlowStudentPassword = "Passw0rd!";
  let rejectApplicationId;

  await runner.run("TC6b: New student registers for reject flow", async () => {
    const response = await apiPost(config.BASE_URL, "/api/auth/register", {
      name: "Reject Flow Student",
      email: rejectFlowStudentEmail,
      phone: `073${Date.now().toString().slice(-7)}`,
      password: rejectFlowStudentPassword,
      confirmPassword: rejectFlowStudentPassword,
      role: "student",
    });

    assert(response.status === 201, `expected status 201, got ${response.status}`);
  });

  await runner.run("TC6b: New student applies for listing", async () => {
    const studentJar = await login(
      config.BASE_URL,
      rejectFlowStudentEmail,
      rejectFlowStudentPassword
    );
    const response = await apiPost(
      config.BASE_URL,
      `/api/listings/${listingId}/apply`,
      {
        moveInDate: "2025-01-20",
        occupancyPreference: "per_room",
        message: "Application for reject flow TC6b.",
      },
      studentJar
    );

    assert(response.status === 201, `expected status 201, got ${response.status}`);
    assert(response.body?.status === "pending", `expected pending, got ${response.body?.status}`);
    assert(response.body?.id, "expected application id");
    rejectApplicationId = response.body.id;
  });

  await runner.run("TC6b: Landlord rejects application — status is rejected", async () => {
    const { landlordEmail, password } = readState();
    const landlordJar = await login(config.BASE_URL, landlordEmail, password);
    const response = await apiPatch(
      config.BASE_URL,
      `/api/applications/${rejectApplicationId}`,
      { action: "reject" },
      landlordJar
    );

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(response.body?.status === "rejected", `expected rejected, got ${response.body?.status}`);
  });

  await runner.run("TC6b: Rejected student receives rejection notification", async () => {
    const studentJar = await login(
      config.BASE_URL,
      rejectFlowStudentEmail,
      rejectFlowStudentPassword
    );
    const response = await apiGet(config.BASE_URL, "/api/notifications", studentJar);

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(
      Array.isArray(response.body?.notifications) &&
      response.body.notifications.some(
        (notification) => notification.type === "application_rejected"
      ),
      "expected application_rejected notification"
    );
  });
}
