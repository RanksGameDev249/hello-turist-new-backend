const requiredByProduction: Record<string, string[]> = {
  core: ["DATABASE_URL", "ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"],
  maps: ["GOOGLE_MAPS_API_KEY"],
  fcm: ["FIREBASE_PROJECT_ID", "FCM_SERVICE_ACCOUNT_EMAIL", "FCM_PRIVATE_KEY"],
  razorpay: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
  storage: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
};

function missing(names: string[]) {
  return names.filter((name) => !process.env[name]?.trim());
}

/**
 * Fail fast only in production. Local development can intentionally run without
 * third-party credentials, while production cannot silently downgrade to mocks.
 * Phone OTP is delivered by Firebase Phone Authentication on the client; the
 * backend only verifies the resulting Firebase ID token.
 */
export function validateProductionIntegrations() {
  if (process.env.NODE_ENV !== "production") return;

  const failures = Object.entries(requiredByProduction)
    .map(([integration, names]) => ({ integration, names: missing(names) }))
    .filter(({ names }) => names.length > 0);

  if (failures.length) {
    const message = failures.map(({ integration, names }) => `${integration}: ${names.join(", ")}`).join("; ");
    throw new Error(`PRODUCTION_INTEGRATION_CONFIG_MISSING:${message}`);
  }
}
