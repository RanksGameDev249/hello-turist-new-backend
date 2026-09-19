import { randomUUID } from "node:crypto";
import { prisma } from "../../core/prisma";
import { createPrivateMediaKey, createPresignedUpload } from "../../core/r2";

const MAX_RECORDING_BYTES = 50 * 1024 * 1024;
const ALLOWED: Record<string, { mediaType: "VIDEO" | "AUDIO"; extension: string }> = {
  "video/mp4": { mediaType: "VIDEO", extension: "mp4" },
  "audio/m4a": { mediaType: "AUDIO", extension: "m4a" },
};

function retentionDays() {
  const configured = Number(process.env.RIDE_RECORDING_RETENTION_DAYS ?? 30);
  if (!Number.isInteger(configured) || configured < 1 || configured > 30) return 30;
  return configured;
}

async function assertRecordingAccess(userId: string, rideId: string, requireActive: boolean) {
  const rows = await prisma.$queryRaw<Array<{ status: string; rider_id: string; assigned: boolean }>>`
    SELECT r.status, r.rider_id,
      EXISTS (
        SELECT 1 FROM ride_assignments a
        WHERE a.ride_id = r.id AND a.driver_id = ${userId}::uuid AND a.status = 'ACCEPTED'
      ) AS assigned
    FROM rides r
    WHERE r.id = ${rideId}::uuid
    LIMIT 1
  `;
  const ride = rows[0];
  if (!ride) throw new Error("RIDE_NOT_FOUND");
  const member = ride.rider_id === userId || ride.assigned;
  if (!member) throw new Error("RIDE_RECORDING_ACCESS_DENIED");
  if (requireActive && ride.status !== "IN_PROGRESS") throw new Error("RECORDING_RIDE_NOT_ACTIVE");
  return ride;
}

async function assertConsent(userId: string, rideId: string) {
  const rows = await prisma.$queryRaw<Array<{ ok: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM ride_events
      WHERE ride_id = ${rideId}::uuid
        AND actor_user_id = ${userId}::uuid
        AND type = 'RECORDING_CONSENT'
        AND COALESCE(payload->>'consent', 'false') = 'true'
    ) AS ok
  `;
  if (!rows[0]?.ok) throw new Error("RECORDING_CONSENT_REQUIRED");
}

export async function createRideRecordingUpload(input: {
  userId: string;
  rideId: string;
  contentType: string;
  sizeBytes: number;
}) {
  const media = ALLOWED[input.contentType];
  if (!media) throw new Error("UNSUPPORTED_RECORDING_TYPE");
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_RECORDING_BYTES) {
    throw new Error("INVALID_RECORDING_SIZE");
  }

  await assertRecordingAccess(input.userId, input.rideId, true);
  await assertConsent(input.userId, input.rideId);

  const key = createPrivateMediaKey(input.userId, "ride-recording", media.extension);
  const uploadUrl = await createPresignedUpload(key, input.contentType, 300);
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + retentionDays() * 24 * 60 * 60 * 1000);

  await prisma.$executeRaw`
    INSERT INTO ride_recordings
      (id, ride_id, uploader_user_id, media_type, content_type, object_key, size_bytes, status, retention_expires_at)
    VALUES
      (${id}::uuid, ${input.rideId}::uuid, ${input.userId}::uuid, ${media.mediaType}, ${input.contentType}, ${key}, ${input.sizeBytes}::bigint, 'UPLOADING', ${expiresAt})
  `;

  return { id, rideId: input.rideId, mediaType: media.mediaType, contentType: input.contentType, sizeBytes: input.sizeBytes, objectKey: key, uploadUrl, retentionExpiresAt: expiresAt.toISOString() };
}

export async function completeRideRecording(input: { userId: string; rideId: string; recordingId: string; checksum?: string }) {
  await assertRecordingAccess(input.userId, input.rideId, false);
  const rows = await prisma.$queryRaw<Array<{ id: string; object_key: string; content_type: string; size_bytes: bigint; status: string }>>`
    SELECT id, object_key, content_type, size_bytes, status
    FROM ride_recordings
    WHERE id = ${input.recordingId}::uuid AND ride_id = ${input.rideId}::uuid AND uploader_user_id = ${input.userId}::uuid
    LIMIT 1
  `;
  const recording = rows[0];
  if (!recording) throw new Error("RECORDING_NOT_FOUND");
  if (recording.status === "READY") return { id: recording.id, status: recording.status };
  if (recording.status !== "UPLOADING") throw new Error("RECORDING_NOT_UPLOADABLE");

  await assertObjectExists(recording.object_key, recording.content_type, Number(recording.size_bytes));

  await prisma.$executeRaw`
    UPDATE ride_recordings
    SET status = 'READY', checksum = ${input.checksum ?? null}, completed_at = NOW()
    WHERE id = ${input.recordingId}::uuid AND status = 'UPLOADING'
  `;

  return { id: recording.id, status: "READY" };
}

async function assertObjectExists(key: string, contentType: string, expectedSize: number) {
  const { headPrivateObject } = await import("../../core/r2");
  const head = await headPrivateObject(key);
  if (head.contentType !== contentType || head.contentLength !== expectedSize) throw new Error("RECORDING_OBJECT_MISMATCH");
}

export async function listRideRecordings(userId: string, rideId: string) {
  await assertRecordingAccess(userId, rideId, false);
  return prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT id, media_type AS "mediaType", content_type AS "contentType", size_bytes AS "sizeBytes",
           status, retention_expires_at AS "retentionExpiresAt", created_at AS "createdAt", completed_at AS "completedAt"
    FROM ride_recordings
    WHERE ride_id = ${rideId}::uuid AND status <> 'EXPIRED'
    ORDER BY created_at DESC
  `;
}
