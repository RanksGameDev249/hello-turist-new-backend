import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.R2_ENDPOINT;
const bucket = process.env.R2_BUCKET;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

function client() {
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("R2_STORAGE_NOT_CONFIGURED");
  }
  return new S3Client({ region: "auto", endpoint, credentials: { accessKeyId, secretAccessKey } });
}

export async function deletePrivateObject(key: string) {
  if (!bucket) throw new Error("R2_STORAGE_NOT_CONFIGURED");
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
