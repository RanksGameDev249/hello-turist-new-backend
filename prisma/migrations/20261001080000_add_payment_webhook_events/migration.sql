CREATE TABLE IF NOT EXISTS "payment_webhook_events" (
  "event_id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "payload" JSONB,
  "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ,
  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("event_id")
);

CREATE INDEX IF NOT EXISTS "payment_webhook_events_processed_at_idx"
  ON "payment_webhook_events" ("processed_at");
