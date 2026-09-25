import "dotenv/config";
import crypto from "node:crypto";

const baseUrl = (process.env.E2E_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/$/, "");
const timeoutMs = Number(process.env.E2E_TIMEOUT_MS || 15000);
const results: Array<{ name: string; ok: boolean; detail?: string }> = [];

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function request(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function check(name: string, fn: () => Promise<string | void>) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
    console.log(`PASS ${name}${detail ? ` - ${detail}` : ""}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, detail });
    console.error(`FAIL ${name} - ${detail}`);
  }
}

async function backendHealth() {
  const response = await request(`${baseUrl}/health`);
  if (!response.ok) throw new Error(`backend health ${response.status}`);
  const body = await response.json() as { data?: { status?: string } };
  if (body.data?.status !== "ok") throw new Error("backend health payload invalid");
  return "backend reachable";
}

async function backendReadiness() {
  const response = await request(`${baseUrl}/ready`);
  const body = await response.json() as { data?: { status?: string; database?: string; redis?: string }; error?: { code?: string } };
  if (!response.ok) {
    throw new Error(`backend readiness ${response.status} (${body.error?.code || "unknown"})`);
  }
  if (body.data?.status !== "ready" || body.data.database !== "ok" || body.data.redis !== "ok") {
    throw new Error("backend readiness payload invalid");
  }
  return "PostgreSQL + Redis ready";
}

async function googleMaps() {
  const key = required("GOOGLE_MAPS_API_KEY");
  const origin = process.env.E2E_MAP_ORIGIN || "30.3782,76.7767";
  const destination = process.env.E2E_MAP_DESTINATION || "30.3398,76.3869";
  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("key", key);
  const response = await request(url.toString());
  const body = await response.json() as { status?: string; error_message?: string; routes?: unknown[] };
  if (!response.ok || body.status !== "OK" || !body.routes?.length) {
    throw new Error(`Google Maps status=${body.status || response.status} ${body.error_message || "no route"}`);
  }
  return "live Directions API route returned";
}

async function firebaseFcm() {
  const projectId = required("FIREBASE_PROJECT_ID");
  const email = required("FCM_SERVICE_ACCOUNT_EMAIL");
  const privateKey = required("FCM_PRIVATE_KEY").replace(/\\n/g, "\n");
  const token = required("E2E_FCM_DEVICE_TOKEN");
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: email, sub: email, aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/firebase.messaging", iat: now, exp: now + 3600,
  })).toString("base64url");
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(privateKey, "base64url");
  const assertion = `${unsigned}.${signature}`;
  const tokenResponse = await request("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const tokenBody = await tokenResponse.json() as { access_token?: string; error?: string; error_description?: string };
  if (!tokenResponse.ok || !tokenBody.access_token) throw new Error(`Google OAuth: ${tokenBody.error_description || tokenBody.error || tokenResponse.status}`);

  const sendResponse = await request(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenBody.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { token, data: { e2e: "true", timestamp: String(Date.now()) } } }),
  });
  const sendBody = await sendResponse.json() as { name?: string; error?: { message?: string } };
  if (!sendResponse.ok || !sendBody.name) throw new Error(`FCM send: ${sendBody.error?.message || sendResponse.status}`);
  return "live FCM message accepted by Firebase";
}

async function razorpayOrder() {
  const key = required("RAZORPAY_KEY_ID");
  const secret = required("RAZORPAY_KEY_SECRET");
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const response = await request("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Number(process.env.E2E_RAZORPAY_AMOUNT_PAISE || 100), currency: "INR", receipt: `e2e_${Date.now()}`, notes: { purpose: "production-integration-e2e" } }),
  });
  const body = await response.json() as { id?: string; error?: { description?: string } };
  if (!response.ok || !body.id) throw new Error(`Razorpay: ${body.error?.description || response.status}`);
  return `live order ${body.id} created (not captured)`;
}

async function cloudinary() {
  const cloud = required("CLOUDINARY_CLOUD_NAME");
  const key = required("CLOUDINARY_API_KEY");
  const secret = required("CLOUDINARY_API_SECRET");
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHash("sha1").update(`timestamp=${timestamp}${secret}`).digest("hex");
  const body = new URLSearchParams({
    file: "data:text/plain;base64,SGVsbG8gS3VydWtzaGV0cmEgRSJF",
    api_key: key, timestamp: String(timestamp), signature,
    type: "authenticated", folder: "hello-kurukshetra-e2e", public_id: `integration-${Date.now()}`,
  });
  const response = await request(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/auto/upload`, { method: "POST", body });
  const result = await response.json() as { secure_url?: string; error?: { message?: string } };
  if (!response.ok || !result.secure_url) throw new Error(`Cloudinary: ${result.error?.message || response.status}`);
  return "live authenticated upload succeeded";
}

async function main() {
  if (process.env.NODE_ENV !== "production" && process.env.ALLOW_PRODUCTION_E2E !== "true") {
    throw new Error("Set NODE_ENV=production or ALLOW_PRODUCTION_E2E=true to run live third-party E2E tests");
  }

  await check("backend health", backendHealth);
  await check("backend readiness", backendReadiness);
  await check("Google Maps Directions", googleMaps);
  await check("Firebase OAuth + FCM", firebaseFcm);
  await check("Razorpay live order", razorpayOrder);
  await check("Cloudinary authenticated upload", cloudinary);

  const failed = results.filter((result) => !result.ok);
  console.log(`\nProduction integration E2E: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(`PRODUCTION_E2E_ABORTED - ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
