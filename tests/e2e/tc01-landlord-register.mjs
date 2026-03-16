import { config } from "./config.mjs";
import { apiPost, assert, login } from "./helpers.mjs";

export async function run(runner) {
  const uniqueEmail = `landlord.${Date.now()}@example.com`;
  const password = "Passw0rd!";
  const payload = {
    name: "E2E Landlord",
    email: uniqueEmail,
    phone: `077${Date.now().toString().slice(-7)}`,
    password,
    confirmPassword: password,
    role: "landlord",
  };

  await runner.run("TC1: Landlord registers successfully", async () => {
    const response = await apiPost(config.BASE_URL, "/api/auth/register", payload);
    assert(response.status === 201, `expected status 201, got ${response.status}`);
    assert(response.body?.ok === true, "expected ok: true from landlord registration");
  });

  await runner.run("TC1: Landlord can log in after registration", async () => {
    const cookieJar = await login(config.BASE_URL, uniqueEmail, password);
    assert(
      Array.from(cookieJar.keys()).some((name) => name.includes("next-auth.session-token")),
      "expected session token cookie for landlord login"
    );
  });

  await runner.run("TC1: Duplicate registration blocked (409)", async () => {
    const response = await apiPost(config.BASE_URL, "/api/auth/register", payload);
    assert(response.status === 409, `expected status 409, got ${response.status}`);
  });
}
