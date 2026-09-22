import { strict as assert } from "node:assert";

const baseUrl = (process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

async function main() {
  const response = await fetch(`${baseUrl}/api/v1/notifications`);
  assert.equal(response.status, 401, "notification API must reject anonymous access");

  if (!process.env.FCM_SERVICE_ACCOUNT_EMAIL || !process.env.FCM_PRIVATE_KEY || !process.env.FIREBASE_PROJECT_ID) {
    console.log("SKIP live FCM delivery: Firebase service-account environment is not configured");
  } else {
    console.log("FCM credentials detected; authenticated delivery requires a test-user token/device token and is covered by the notification service integration path");
  }
  console.log("Notification E2E boundary check passed");
}
main().catch((error) => { console.error(error); process.exit(1); });
