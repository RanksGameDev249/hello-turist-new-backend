import assert from "node:assert/strict";
import { rejectOversizedJson, securityHeaders } from "../src/middleware/security.middleware";

function response() {
  const headers = new Map<string, string>();
  return { setHeader(name: string, value: string) { headers.set(name, value); return this; }, get(name: string) { return headers.get(name); } };
}

const res = response();
securityHeaders({} as never, res as never, (() => undefined) as never);
assert.equal(res.get("X-Content-Type-Options"), "nosniff");
assert.equal(res.get("X-Frame-Options"), "DENY");
assert.equal(res.get("Referrer-Policy"), "no-referrer");

let status = 0;
let body: unknown;
rejectOversizedJson({ headers: { "content-length": "2000001" } } as never, { status(code: number) { status = code; return this; }, json(value: unknown) { body = value; return this; } } as never, (() => { throw new Error("next should not run"); }) as never);
assert.equal(status, 413);
assert.deepEqual(body, { error: "Request body too large" });
console.log("security middleware tests passed");
