import assert from "node:assert/strict";

const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const response = await fetch(`${baseUrl}/health`);
assert.equal(response.status, 200, `health returned ${response.status}`);
const body = await response.json() as { success?: boolean; data?: { status?: string } };
assert.equal(body.success, true);
assert.equal(body.data?.status, "ok");
console.log(`production smoke passed: ${baseUrl}/health`);
