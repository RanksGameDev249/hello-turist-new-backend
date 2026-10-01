import crypto from "node:crypto";
import { strict as assert } from "node:assert";

const baseUrl = (process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const userToken = process.env.E2E_USER_TOKEN;
const rideId = process.env.E2E_PAYMENT_RIDE_ID;
if (!userToken || !rideId) throw new Error("Set E2E_USER_TOKEN and E2E_PAYMENT_RIDE_ID");

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}`, ...(init.method && init.method !== "GET" ? { "Idempotency-Key": crypto.randomUUID() } : {}), ...(init.headers ?? {}) } });
  const text = await response.text();
  let body: any = {}; try { body = text ? JSON.parse(text) : {}; } catch { /* keep raw */ }
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} -> ${response.status}: ${body?.error?.message ?? text}`);
  return body;
}

async function main() {
  const order = await request("/api/v1/payments/razorpay/order", { method: "POST", body: JSON.stringify({ rideId }) });
  const orderId = order?.data?.id ?? order?.data?.order?.id;
  assert.equal(typeof orderId, "string", "Razorpay order id missing");
  const payment = await request(`/api/v1/payments?rideId=${encodeURIComponent(rideId)}`);
  assert.ok(payment?.data !== undefined, "payment list response missing data");
  console.log(`Payment lifecycle E2E passed: Razorpay order ${orderId}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
