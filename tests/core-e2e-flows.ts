import { strict as assert } from "node:assert";

const baseUrl = (process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const timeoutMs = Number(process.env.E2E_TIMEOUT_MS ?? 15000);

async function request(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${baseUrl}${path}`, { ...init, signal: controller.signal });
  } finally { clearTimeout(timer); }
}

async function main() {
  const health = await request("/health");
  assert.equal(health.status, 200);
  const protectedRoutes = [
    "/api/v1/users/me",
    "/api/v1/rides",
    "/api/v1/payments",
    "/api/v1/notifications",
    "/api/v1/trusted-contacts",
    "/api/v1/admin/settings",
  ];
  for (const path of protectedRoutes) {
    const response = await request(path);
    assert.equal(response.status, 401, `${path} must reject anonymous access`);
  }
  console.log(`Core E2E boundary checks passed: ${protectedRoutes.length} protected flows`);
}

main().catch((error) => { console.error(error); process.exit(1); });
