import { config } from "./config.mjs";
import { apiGet, apiPatch, apiPost, assert, login, readState, writeState } from "./helpers.mjs";

export async function run(runner) {
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
    const studentJar = await login(
      config.BASE_URL,
      config.STUDENT_VERIFIED_EMAIL,
      config.STUDENT_VERIFIED_PASSWORD
    );
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
    const studentJar = await login(
      config.BASE_URL,
      config.STUDENT_VERIFIED_EMAIL,
      config.STUDENT_VERIFIED_PASSWORD
    );
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
    const studentJar = await login(
      config.BASE_URL,
      config.STUDENT_VERIFIED_EMAIL,
      config.STUDENT_VERIFIED_PASSWORD
    );
    const response = await apiGet(config.BASE_URL, `/api/inbox/${conversationId}/messages`, studentJar);

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(
      Array.isArray(response.body?.messages) &&
      response.body.messages.some((message) => message.body === "Hello landlord!"),
      "expected sent message in inbox thread"
    );
  });
}
