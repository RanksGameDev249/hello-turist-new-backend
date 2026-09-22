import { strict as assert } from "node:assert";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function check(path: string, expected: number) {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.status, expected, `${path}: expected ${expected}, got ${response.status}`);
  return response;
}

async function main() {
  const health = await check("/health", 200);
  const body = await health.json() as { success?: boolean; data?: { status?: string } };
  assert.equal(body.success, true);
  assert.equal(body.data?.status, "ok");

  // Protected admin route must not be anonymously accessible.
  await check("/api/v1/admin/settings", 401);
  console.log(`E2E smoke passed against ${baseUrl}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
