import { AssertionError } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.join(__dirname, ".state.json");

const COLORS = {
  green: "\u001b[32m",
  red: "\u001b[31m",
  cyan: "\u001b[36m",
  reset: "\u001b[0m",
};

export function assert(condition, message) {
  if (!condition) {
    throw new AssertionError({ message });
  }
}

function normalizeUrl(baseUrl, routePath) {
  return new URL(routePath, baseUrl).toString();
}

function getCookieHeader(cookieJar) {
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function splitSetCookieHeader(headerValue) {
  return headerValue.split(/,(?=\s*[^;=]+=[^;]+)/g);
}

function extractSetCookies(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const single = headers.get("set-cookie");
  return single ? splitSetCookieHeader(single) : [];
}

function captureCookies(headers, cookieJar) {
  for (const entry of extractSetCookies(headers)) {
    const [cookiePart] = entry.split(";");
    const separatorIndex = cookiePart.indexOf("=");
    if (separatorIndex === -1) continue;

    const name = cookiePart.slice(0, separatorIndex).trim();
    const value = cookiePart.slice(separatorIndex + 1).trim();
    if (name) {
      cookieJar.set(name, value);
    }
  }
}

async function parseResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { raw: text } : null;
}

async function apiRequest(method, baseUrl, routePath, body, cookieJar = new Map()) {
  const headers = {};
  const cookieHeader = getCookieHeader(cookieJar);

  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  if (body !== undefined && body !== null) {
    headers["content-type"] = "application/json";
  }

  const response = await fetch(normalizeUrl(baseUrl, routePath), {
    method,
    headers,
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  captureCookies(response.headers, cookieJar);

  return {
    status: response.status,
    headers: response.headers,
    body: await parseResponseBody(response),
    cookieJar,
  };
}

export function apiGet(baseUrl, routePath, cookieJar = new Map()) {
  return apiRequest("GET", baseUrl, routePath, undefined, cookieJar);
}

export function apiPost(baseUrl, routePath, body, cookieJar = new Map()) {
  return apiRequest("POST", baseUrl, routePath, body, cookieJar);
}

export function apiPatch(baseUrl, routePath, body, cookieJar = new Map()) {
  return apiRequest("PATCH", baseUrl, routePath, body, cookieJar);
}

export async function ensureBaseUrlReachable(baseUrl) {
  try {
    const response = await fetch(normalizeUrl(baseUrl, "/api/listings"), {
      method: "GET",
      redirect: "manual",
    });

    return response.status;
  } catch (error) {
    const detail =
      error && typeof error === "object" && "cause" in error && error.cause
        ? String(error.cause)
        : error instanceof Error
          ? error.message
          : String(error);

    throw new Error(
      [
        `E2E target is unreachable at ${baseUrl}.`,
        "Set BASE_URL to a live app URL, or start the local app at that address before running E2E tests.",
        `Connection detail: ${detail}`,
      ].join("\n")
    );
  }
}

export async function getCsrfToken(baseUrl) {
  const response = await apiGet(baseUrl, "/api/auth/csrf", new Map());
  assert(response.status === 200, `expected CSRF status 200, got ${response.status}`);
  assert(response.body?.csrfToken, "expected csrfToken in /api/auth/csrf response");
  return response.body.csrfToken;
}

export async function login(baseUrl, email, password) {
  const cookieJar = new Map();
  const csrfResponse = await apiGet(baseUrl, "/api/auth/csrf", cookieJar);

  assert(csrfResponse.status === 200, `expected CSRF status 200, got ${csrfResponse.status}`);
  assert(csrfResponse.body?.csrfToken, "expected csrfToken in /api/auth/csrf response");

  const body = new URLSearchParams({
    csrfToken: csrfResponse.body.csrfToken,
    email,
    password,
    callbackUrl: "/",
    redirect: "false",
  });

  const response = await fetch(normalizeUrl(baseUrl, "/api/auth/callback/credentials"), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: getCookieHeader(cookieJar),
    },
    body,
    redirect: "manual",
  });

  captureCookies(response.headers, cookieJar);

  assert(
    Array.from(cookieJar.keys()).some((name) => name.includes("next-auth.session-token")),
    "expected NextAuth session token cookie after login"
  );

  return cookieJar;
}

export function readState() {
  if (!fs.existsSync(STATE_FILE)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

export function writeState(updates) {
  const nextState = {
    ...readState(),
    ...updates,
  };

  fs.writeFileSync(STATE_FILE, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
  return nextState;
}

export function resetState(nextState = {}) {
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
  return nextState;
}

export function makeTestRunner() {
  const results = [];

  return {
    async run(name, fn) {
      try {
        await fn();
        results.push({ name, ok: true });
        console.log(`${COLORS.green}PASS${COLORS.reset} ${name}`);
      } catch (error) {
        results.push({ name, ok: false, error });
        console.error(`${COLORS.red}FAIL${COLORS.reset} ${name} ${error.name}: ${error.message}`);
        if (error.stack) {
          const [, ...stackLines] = error.stack.split("\n");
          for (const line of stackLines.slice(0, 2)) {
            console.error(`     ${line.trim()}`);
          }
        }
      }
    },
    summarize() {
      const passed = results.filter((result) => result.ok).length;
      const failed = results.length - passed;
      const color = failed === 0 ? COLORS.green : COLORS.red;

      console.log(
        `${COLORS.cyan}Summary${COLORS.reset} ${color}${passed} passed${COLORS.reset}, ${failed} failed`
      );

      return failed === 0 ? 0 : 1;
    },
  };
}
