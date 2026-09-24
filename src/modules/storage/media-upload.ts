import { randomUUID } from "node:crypto";
import { signCloudinaryUpload } from "../../core/cloudinary";

export const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "audio/m4a"] as const;
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

function resourceType(contentType: string) {
  return contentType.startsWith("image/") ? "image" : "video";
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "general";
}

export function preparePrivateMediaUpload(input: { userId: string; contentType: string; size: number; purpose: string }) {
  if (!ALLOWED_MEDIA_TYPES.includes(input.contentType as (typeof ALLOWED_MEDIA_TYPES)[number])) {
    throw new Error("Unsupported media type");
  }
  if (!Number.isInteger(input.size) || input.size <= 0 || input.size > MAX_MEDIA_BYTES) {
    throw new Error("Invalid media size");
  }
  const publicId = `private/${input.userId}/${safeSegment(input.purpose)}/${randomUUID()}`;
  return { key: publicId, publicId, contentType: input.contentType, size: input.size };
}

export function createPrivateMediaUploadUrl(input: { userId: string; contentType: string; size: number; purpose: string }) {
  const media = preparePrivateMediaUpload(input);
  const timestamp = Math.floor(Date.now() / 1000);
  const type = input.purpose.startsWith("profile_avatar") ? ("upload" as const) : ("authenticated" as const);
  const resource_type = resourceType(media.contentType);
  // Cloudinary upload signatures must only include parameters that Cloudinary signs.
  // resource_type is selected by the upload URL and is not part of the signature.
  const signed = signCloudinaryUpload({ public_id: media.publicId, type, timestamp });

  return {
    ...media,
    uploadUrl: `https://api.cloudinary.com/v1_1/${signed.cloudName}/${resource_type}/upload`,
    uploadParams: {
      public_id: media.publicId,
      resource_type,
      type,
      timestamp,
      api_key: signed.apiKey,
      signature: signed.signature,
    },
  };
}
