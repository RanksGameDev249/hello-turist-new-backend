import { randomUUID } from "node:crypto";

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET = process.env.R2_BUCKET;

export type PrivateMediaKind = "ride-recording" | "sos-media";

export function assertR2Configured() {
  if (!R2_ENDPOINT || !R2_BUCKET) {
    throw new Error("R2_STORAGE_NOT_CONFIGURED");
  }
}

export function createPrivateObjectKey(kind: PrivateMediaKind, userId: string, extension = "bin") {
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return `private/${kind}/${userId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${safeExt}`;
}

/**
 * Returns configuration needed by the application-side S3/R2 adapter.
 * Credentials are deliberately read only from environment variables and are
 * never persisted in the repository.
 */
export function getR2StorageConfig() {
  assertR2Configured();
  return {
    endpoint: R2_ENDPOINT!,
    bucket: R2_BUCKET!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  };
}
