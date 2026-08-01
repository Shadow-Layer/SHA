import { config } from "./config.mjs";
import { apiGet, apiPost, assert, login, readState, writeState } from "./helpers.mjs";

export async function run(runner) {
  const { tenantEmail, password } = readState();
  const verifiedEmail = `student.${Date.now()}@africau.edu`;

  await runner.run("TC4: Student registers with a normal email", async () => {
    const response = await apiPost(config.BASE_URL, "/api/auth/register", {
      name: "E2E Student",
      email: tenantEmail,
      phone: `078${Date.now().toString().slice(-7)}`,
      password,
      confirmPassword: password,
      role: "student",
    });

    assert(response.status === 201, `expected status 201, got ${response.status}`);
    assert(response.body?.isVerifiedStudent !== true, "expected normal email to remain unverified");
  });

  await runner.run("TC4: Normal student can log in", async () => {
    const cookieJar = await login(config.BASE_URL, tenantEmail, password);
    assert(
      Array.from(cookieJar.keys()).some((name) => name.includes("next-auth.session-token")),
      "expected session token cookie for student login"
    );
  });

  await runner.run("TC4: Verified-domain student registers successfully", async () => {
    const response = await apiPost(config.BASE_URL, "/api/auth/register", {
      name: "Verified Student",
      email: verifiedEmail,
      phone: `071${Date.now().toString().slice(-7)}`,
      password,
      confirmPassword: password,
      role: "student",
    });

    assert(
      response.status === 201 || response.status === 409,
      `expected status 201 or 409, got ${response.status}`
    );
    writeState({ verifiedStudentEmail: verifiedEmail, verifiedStudentPassword: password });
  });

  await runner.run("TC4: Verified-domain student session exposes verified status", async () => {
    const verifiedStudentJar = await login(config.BASE_URL, verifiedEmail, password);
    const response = await apiGet(config.BASE_URL, "/api/auth/session", verifiedStudentJar);

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(response.body?.user?.email === verifiedEmail, "expected verified student session");
    assert(
      response.body?.user?.isVerifiedStudent === true,
      "expected verified-domain student to be marked verified"
    );
  });
}
