import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const endpoint = process.env.R2_ENDPOINT;
const bucket = process.env.R2_BUCKET;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

function client() {
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("R2_STORAGE_NOT_CONFIGURED");
  }
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function createPrivateMediaKey(userId: string, kind: "ride-recording" | "sos-media", extension = "bin") {
  const ext = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return `private/${kind}/${userId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
}

export async function createPresignedUpload(key: string, contentType: string, expiresInSeconds = 300) {
  if (!bucket) throw new Error("R2_STORAGE_NOT_CONFIGURED");
  return getSignedUrl(client(), new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn: expiresInSeconds });
}

export async function createPresignedDownload(key: string, expiresInSeconds = 300) {
  if (!bucket) throw new Error("R2_STORAGE_NOT_CONFIGURED");
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: expiresInSeconds });
}
