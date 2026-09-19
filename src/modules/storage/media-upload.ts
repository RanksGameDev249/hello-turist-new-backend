import { randomUUID } from "node:crypto";
import { createPresignedUpload } from "../../core/r2";

export const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "audio/m4a"] as const;
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

export function preparePrivateMediaUpload(input: { userId: string; contentType: string; size: number; purpose: string }) {
  if (!ALLOWED_MEDIA_TYPES.includes(input.contentType as (typeof ALLOWED_MEDIA_TYPES)[number])) {
    throw new Error("Unsupported media type");
  }
  if (!Number.isInteger(input.size) || input.size <= 0 || input.size > MAX_MEDIA_BYTES) {
    throw new Error("Invalid media size");
  }
  const key = `private/${input.userId}/${input.purpose}/${randomUUID()}`;
  return { key, contentType: input.contentType, size: input.size };
}

export async function createPrivateMediaUploadUrl(input: { userId: string; contentType: string; size: number; purpose: string }) {
  const media = preparePrivateMediaUpload(input);
  const uploadUrl = await createPresignedUpload(media.key, media.contentType);
  return { ...media, uploadUrl };
}
