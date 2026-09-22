import { strict as assert } from "node:assert";
import crypto from "node:crypto";

const baseUrl = (process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

async function main() {
  if (!secret) {
    console.log("SKIP: RAZORPAY_WEBHOOK_SECRET is not configured");
    return;
  }
  const body = JSON.stringify({ event: "payment.captured", payload: {} });
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const response = await fetch(`${baseUrl}/api/v1/payments/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-razorpay-signature": signature, "x-razorpay-event-id": `qa-${Date.now()}` },
    body,
  });
  assert.notEqual(response.status, 401, "validly signed webhook must not be rejected as unauthorized");
  console.log(`Razorpay webhook signature E2E check passed (${response.status})`);
}
main().catch((error) => { console.error(error); process.exit(1); });
