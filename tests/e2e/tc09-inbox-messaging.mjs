import { config } from "./config.mjs";
import { apiGet, apiPatch, apiPost, assert, login, readState, writeState } from "./helpers.mjs";

export async function run(runner) {
  const state = readState();
  const { listingId } = state;
  const verifiedStudentEmail = state.verifiedStudentEmail ?? config.STUDENT_VERIFIED_EMAIL;
  const verifiedStudentPassword = state.verifiedStudentPassword ?? config.STUDENT_VERIFIED_PASSWORD;
  const rejectFlowStudentEmail = `reject.flow.${Date.now()}@example.com`;
  const rejectFlowStudentPassword = "Passw0rd!";
  let rejectApplicationId;

  await runner.run("TC9: Landlord accepts application and creates conversation", async () => {
    const { tc09ApplicationId } = readState();
    const landlordJar = await login(config.BASE_URL, config.LANDLORD_EMAIL, config.LANDLORD_PASSWORD);
    const response = await apiPatch(
      config.BASE_URL,
      `/api/applications/${tc09ApplicationId}`,
      { action: "accept" },
      landlordJar
    );

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(response.body?.status === "accepted", `expected accepted, got ${response.body?.status}`);
    assert(response.body?.conversationId, "expected conversationId after acceptance");

    writeState({ conversationId: response.body.conversationId });
  });

  await runner.run("TC9: Student sees conversation in inbox", async () => {
    const { conversationId } = readState();
    const studentJar = await login(config.BASE_URL, verifiedStudentEmail, verifiedStudentPassword);
    const response = await apiGet(config.BASE_URL, "/api/inbox", studentJar);

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(
      Array.isArray(response.body?.conversations) &&
      response.body.conversations.some((conversation) => conversation.id === conversationId),
      "expected accepted conversation in inbox"
    );
  });

  await runner.run("TC9: Student sends inbox message", async () => {
    const { conversationId } = readState();
    const studentJar = await login(config.BASE_URL, verifiedStudentEmail, verifiedStudentPassword);
    const response = await apiPost(
      config.BASE_URL,
      `/api/inbox/${conversationId}/messages`,
      { body: "Hello landlord!" },
      studentJar
    );

    assert(response.status === 201, `expected status 201, got ${response.status}`);
  });

  await runner.run("TC9: Inbox thread includes sent message", async () => {
    const { conversationId } = readState();
    const studentJar = await login(config.BASE_URL, verifiedStudentEmail, verifiedStudentPassword);
    const response = await apiGet(config.BASE_URL, `/api/inbox/${conversationId}/messages`, studentJar);

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(
      Array.isArray(response.body?.messages) &&
      response.body.messages.some((message) => message.body === "Hello landlord!"),
      "expected sent message in inbox thread"
    );
  });

  await runner.run("TC9: Student submits a second application for reject flow", async () => {
    const registerResponse = await apiPost(config.BASE_URL, "/api/auth/register", {
      name: "Reject Flow Student",
      email: rejectFlowStudentEmail,
      phone: `073${Date.now().toString().slice(-7)}`,
      password: rejectFlowStudentPassword,
      confirmPassword: rejectFlowStudentPassword,
      role: "student",
    });

    assert(registerResponse.status === 201, `expected status 201, got ${registerResponse.status}`);

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
        message: "Pending application for reject flow.",
      },
      studentJar
    );

    assert(response.status === 201, `expected status 201, got ${response.status}`);
    assert(response.body?.id, "expected reject application id");
    rejectApplicationId = response.body.id;
  });

  await runner.run("TC9: Landlord rejects application", async () => {
    const landlordJar = await login(config.BASE_URL, config.LANDLORD_EMAIL, config.LANDLORD_PASSWORD);
    const response = await apiPatch(
      config.BASE_URL,
      `/api/applications/${rejectApplicationId}`,
      { action: "reject" },
      landlordJar
    );

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(response.body?.status === "rejected", `expected rejected, got ${response.body?.status}`);
  });
}
