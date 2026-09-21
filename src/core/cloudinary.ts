import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

let configured = false;

export function assertCloudinaryConfigured() {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("CLOUDINARY_STORAGE_NOT_CONFIGURED");
  }
}

function ensureConfigured() {
  assertCloudinaryConfigured();
  if (!configured) {
    cloudinary.config({
      cloud_name: cloudName!,
      api_key: apiKey!,
      api_secret: apiSecret!,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export function getCloudinary() {
  return ensureConfigured();
}

/**
 * Parameters for a signed client-side Cloudinary upload.
 * The API secret never leaves the backend.
 */
export function signCloudinaryUpload(params: Record<string, string | number>) {
  const client = ensureConfigured();
  const signature = client.utils.api_sign_request(params, apiSecret!);

  return {
    signature,
    cloudName: cloudName!,
    apiKey: apiKey!,
  };
}

export function createCloudinaryPublicId(rideId: string, media: "VIDEO" | "AUDIO", id: string) {
  const safeRideId = rideId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  return `private/ride-recording/${safeRideId}/${media.toLowerCase()}/${safeId}`;
}
