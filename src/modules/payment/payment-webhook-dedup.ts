import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../core/prisma";

export async function claimRazorpayWebhook(eventId: string, event: string, payload: unknown) {
  const inserted = await prisma.$queryRaw<Array<{ event_id: string }>>(Prisma.sql`
    INSERT INTO "payment_webhook_events" ("event_id", "event", "payload")
    VALUES (${eventId}, ${event}, ${payload == null ? Prisma.DbNull : payload as Prisma.InputJsonValue})
    ON CONFLICT ("event_id") DO NOTHING
    RETURNING "event_id"
  `);
  if (inserted.length > 0) return { accepted: true, duplicate: false };

  const existing = await prisma.$queryRaw<Array<{ processed_at: Date | null }>>(Prisma.sql`
    SELECT "processed_at"
    FROM "payment_webhook_events"
    WHERE "event_id" = ${eventId}
    LIMIT 1
  `);
  return { accepted: false, duplicate: existing[0]?.processed_at != null };
}

export async function markRazorpayWebhookProcessed(eventId: string) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "payment_webhook_events"
    SET "processed_at" = CURRENT_TIMESTAMP
    WHERE "event_id" = ${eventId}
  `);
}

export async function releaseRazorpayWebhook(eventId: string) {
  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "payment_webhook_events"
    WHERE "event_id" = ${eventId} AND "processed_at" IS NULL
  `);
}
