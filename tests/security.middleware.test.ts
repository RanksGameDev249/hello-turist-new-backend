import { strict as assert } from "node:assert";
import { securityHeaders } from "../src/middleware/security";

function responseMock() {
  const headers = new Map<string, string>();
  return {
    setHeader(name: string, value: string) { headers.set(name, value); },
    getHeader(name: string) { return headers.get(name); },
    headers,
  };
}

const req = {} as any;
let nextCalled = false;
const res = responseMock();
securityHeaders(req, res as any, () => { nextCalled = true; });

assert.equal(nextCalled, true);
assert.equal(res.getHeader("X-Content-Type-Options"), "nosniff");
assert.equal(res.getHeader("X-Frame-Options"), "DENY");
assert.equal(res.getHeader("Referrer-Policy"), "no-referrer");
assert.equal(res.getHeader("Cross-Origin-Opener-Policy"), "same-origin");
assert.equal(res.getHeader("Cross-Origin-Resource-Policy"), "same-site");
assert.equal(res.getHeader("Permissions-Policy"), "camera=(), microphone=(), geolocation=(self)");

console.log("Security middleware regression checks passed");
