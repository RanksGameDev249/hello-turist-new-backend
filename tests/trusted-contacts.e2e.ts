import assert from "node:assert/strict";

/**
 * Contract-level smoke tests for the Trusted Contacts P0 API.
 *
 * Set TEST_BASE_URL and TEST_AUTH_TOKEN to run against a local server:
 *   TEST_BASE_URL=http://localhost:3000 TEST_AUTH_TOKEN=... npx tsx tests/trusted-contacts.e2e.ts
 *
 * The test intentionally does not manufacture authentication credentials or
 * mutate production data. A valid test-user token must be supplied explicitly.
 */

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const token = process.env.TEST_AUTH_TOKEN;

if (!token) {
  console.error("TEST_AUTH_TOKEN is required for Trusted Contacts E2E tests");
  process.exit(2);
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

async function main() {
  const list = await request("/api/v1/trusted-contacts");
  assert.equal(list.response.ok, true, `GET trusted contacts failed: ${list.response.status}`);
  assert.ok(list.body !== null, "GET trusted contacts returned no body");

  console.log("Trusted Contacts authenticated-list smoke test: PASS");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
