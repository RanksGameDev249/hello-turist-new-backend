CREATE TABLE "payment_webhook_events" (
  "event_id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "payload" JSONB,
  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("event_id")
);

CREATE INDEX "payment_webhook_events_received_at_idx" ON "payment_webhook_events"("received_at");
