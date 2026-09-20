import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { prisma } from "../../core/prisma";
import { RIDE_RECORDING_POLICY } from "./ride-safety.policy";

const endpoint = process.env.R2_ENDPOINT;
const bucket = process.env.R2_BUCKET;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const retentionDays = Math.max(1, Number(process.env.RIDE_RECORDING_RETENTION_DAYS || 30));

function storageClient() {
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) throw new Error("R2_STORAGE_NOT_CONFIGURED");
  return new S3Client({ region: "auto", endpoint, credentials: { accessKeyId, secretAccessKey } });
}

async function assertActiveRideAccess(userId: string, rideId: string) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId }, include: { assignments: true } });
  if (!ride) throw new Error("RIDE_NOT_FOUND");
  const isRider = ride.riderId === userId;
  const isAcceptedDriver = ride.assignments.some((a) => a.driverId === userId && a.status === "ACCEPTED");
  if (!isRider && !isAcceptedDriver) throw new Error("RIDE_ACCESS_DENIED");
  if (!RIDE_RECORDING_POLICY.recordingOnlyWhileRideActive || !["ASSIGNED", "DRIVER_ARRIVING", "IN_PROGRESS"].includes(ride.status)) throw new Error("RECORDING_ONLY_DURING_ACTIVE_RIDE");
  return ride;
}

async function assertConsent(rideId: string) {
  const event = await prisma.rideEvent.findFirst({ where: { rideId, type: "RECORDING_CONSENT", payload: { path: ["consent"], equals: true } }, orderBy: { createdAt: "desc" } });
  if (!event) throw new Error("RECORDING_CONSENT_REQUIRED");
}

function normalizeMedia(contentType: string) {
  if (contentType === "video/mp4") return "VIDEO" as const;
  if (contentType === "audio/m4a") return "AUDIO" as const;
  throw new Error("RECORDING_MEDIA_NOT_SUPPORTED");
}

export async function prepareRideRecordingUpload(userId: string, rideId: string, contentType: string) {
  await assertActiveRideAccess(userId, rideId);
  await assertConsent(rideId);
  const media = normalizeMedia(contentType);
  const extension = media === "VIDEO" ? "mp4" : "m4a";
  const key = `private/ride-recording/${rideId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const uploadUrl = await getSignedUrl(storageClient(), new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn: 300 });
  return { key, contentType, media, uploadUrl, expiresAt: new Date(Date.now() + retentionDays * 86400000).toISOString() };
}

export async function finalizeRideRecording(userId: string, rideId: string, key: string, contentType: string, bytes?: number) {
  await assertActiveRideAccess(userId, rideId);
  await assertConsent(rideId);
  if (!key.startsWith(`private/ride-recording/${rideId}/`)) throw new Error("RECORDING_KEY_INVALID");
  const head = await storageClient().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  if (head.ContentType !== contentType) throw new Error("RECORDING_CONTENT_TYPE_MISMATCH");
  const expiresAt = new Date(Date.now() + retentionDays * 86400000).toISOString();
  const event = await prisma.rideEvent.create({ data: { rideId, actorUserId: userId, type: "LOCATION_RECORDED", payload: { kind: "RECORDING_UPLOADED", key, contentType, media: normalizeMedia(contentType), bytes: bytes ?? head.ContentLength ?? null, expiresAt } } });
  return { recordingId: event.id, key, contentType, bytes: head.ContentLength ?? bytes ?? null, expiresAt };
}

export async function createRecordingAccessUrl(userId: string, rideId: string, recordingEventId: string) {
  await assertActiveRideAccess(userId, rideId);
  const event = await prisma.rideEvent.findFirst({ where: { id: recordingEventId, rideId, type: "LOCATION_RECORDED" } });
  const payload = (event?.payload ?? {}) as { kind?: string; key?: string; expiresAt?: string };
  if (!event || payload.kind !== "RECORDING_UPLOADED" || !payload.key) throw new Error("RECORDING_NOT_FOUND");
  if (payload.expiresAt && new Date(payload.expiresAt).getTime() <= Date.now()) throw new Error("RECORDING_EXPIRED");
  await prisma.rideEvent.create({ data: { rideId, actorUserId: userId, type: "LOCATION_RECORDED", payload: { kind: "RECORDING_ACCESSED", recordingEventId } } });
  return getSignedUrl(storageClient(), new GetObjectCommand({ Bucket: bucket, Key: payload.key }), { expiresIn: 300 });
}

export async function purgeExpiredRideRecordings() {
  const cutoff = new Date(Date.now() - retentionDays * 86400000);
  const events = await prisma.rideEvent.findMany({ where: { type: "LOCATION_RECORDED", createdAt: { lt: cutoff } }, select: { id: true, rideId: true, payload: true } });
  let deleted = 0;
  const client = storageClient();
  for (const event of events) {
    const payload = (event.payload ?? {}) as { kind?: string; key?: string };
    if (payload.kind !== "RECORDING_UPLOADED" || !payload.key) continue;
    try { await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: payload.key })); } catch { continue; }
    await prisma.rideEvent.create({ data: { rideId: event.rideId, type: "LOCATION_RECORDED", payload: { kind: "RECORDING_DELETED", recordingEventId: event.id, reason: "RETENTION_EXPIRED" } } });
    deleted += 1;
  }
  return deleted;
}
