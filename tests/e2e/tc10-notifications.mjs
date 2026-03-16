import { config } from "./config.mjs";
import { apiGet, apiPatch, assert, login } from "./helpers.mjs";

export async function run(runner) {
  let notificationId;

  await runner.run("TC10: Student notifications endpoint returns items", async () => {
    const studentJar = await login(
      config.BASE_URL,
      config.STUDENT_VERIFIED_EMAIL,
      config.STUDENT_VERIFIED_PASSWORD
    );
    const response = await apiGet(config.BASE_URL, "/api/notifications", studentJar);

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(Array.isArray(response.body?.notifications), "expected notifications array");
    assert(response.body.notifications.length > 0, "expected at least one notification");
  });

  await runner.run("TC10: unreadOnly filter returns unread notifications", async () => {
    const studentJar = await login(
      config.BASE_URL,
      config.STUDENT_VERIFIED_EMAIL,
      config.STUDENT_VERIFIED_PASSWORD
    );
    const response = await apiGet(config.BASE_URL, "/api/notifications?unreadOnly=true", studentJar);

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(Array.isArray(response.body?.notifications), "expected notifications array");
    assert(response.body.notifications.length > 0, "expected at least one unread notification");
    notificationId = response.body.notifications[0].id;
  });

  await runner.run("TC10: Student marks notification as read", async () => {
    const studentJar = await login(
      config.BASE_URL,
      config.STUDENT_VERIFIED_EMAIL,
      config.STUDENT_VERIFIED_PASSWORD
    );
    const response = await apiPatch(
      config.BASE_URL,
      `/api/notifications/${notificationId}`,
      {},
      studentJar
    );

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(response.body?.isRead === true, "expected notification to be marked as read");
  });

  await runner.run("TC10: Read notification disappears from unread list", async () => {
    const studentJar = await login(
      config.BASE_URL,
      config.STUDENT_VERIFIED_EMAIL,
      config.STUDENT_VERIFIED_PASSWORD
    );
    const response = await apiGet(config.BASE_URL, "/api/notifications?unreadOnly=true", studentJar);

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(
      Array.isArray(response.body?.notifications) &&
      response.body.notifications.every((notification) => notification.id !== notificationId),
      "expected marked notification to be absent from unread list"
    );
  });
}
