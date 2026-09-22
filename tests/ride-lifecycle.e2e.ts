import { strict as assert } from "node:assert";

const baseUrl = (process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const userToken = process.env.E2E_USER_TOKEN;
const adminToken = process.env.E2E_ADMIN_TOKEN;
const driverToken = process.env.E2E_DRIVER_TOKEN;
const driverId = process.env.E2E_DRIVER_ID;

if (!userToken || !adminToken || !driverToken || !driverId) throw new Error("Set E2E_USER_TOKEN, E2E_ADMIN_TOKEN, E2E_DRIVER_TOKEN and E2E_DRIVER_ID");

async function request(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  const text = await response.text();
  let body: any = {}; try { body = text ? JSON.parse(text) : {}; } catch { /* keep raw */ }
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} -> ${response.status}: ${body?.error?.message ?? text}`);
  return body;
}

function idFrom(body: any): string {
  const id = body?.data?.id ?? body?.data?.ride?.id ?? body?.id ?? body?.ride?.id;
  assert.equal(typeof id, "string", "response did not contain an id");
  return id;
}

async function main() {
  const created = await request("/api/v1/rides", userToken, { method: "POST", body: JSON.stringify({ pickupAddress: "Kurukshetra Test Pickup", pickupLatitude: 29.9695, pickupLongitude: 76.8783, dropoffAddress: "Kurukshetra Test Dropoff", dropoffLatitude: 29.9457, dropoffLongitude: 76.8170, serviceType: "RIDE_ONLY", paymentMethod: "RAZORPAY" }) });
  const rideId = idFrom(created);
  await request(`/api/v1/admin/rides/${rideId}/assign`, adminToken, { method: "POST", body: JSON.stringify({ driverId }) });
  await request(`/api/v1/rides/${rideId}/accept`, driverToken, { method: "POST" });
  await request(`/api/v1/rides/${rideId}/arriving`, driverToken, { method: "POST" });
  await request(`/api/v1/rides/${rideId}/start`, driverToken, { method: "POST" });
  await request(`/api/v1/rides/${rideId}/complete`, driverToken, { method: "POST" });
  const finalRide = await request(`/api/v1/rides/${rideId}`, userToken);
  assert.equal(finalRide?.data?.status ?? finalRide?.status, "COMPLETED");
  console.log(`Ride lifecycle E2E passed: ${rideId}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
