ALTER TYPE "RideStatus" ADD VALUE IF NOT EXISTS 'INTERRUPTED';
ALTER TYPE "RideEventType" ADD VALUE IF NOT EXISTS 'INTERRUPTED';

CREATE TABLE "ride_recovery_actions" (
  "id" UUID NOT NULL,
  "ride_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "previous_driver_id" UUID,
  "replacement_driver_id" UUID,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "idempotency_key" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ride_recovery_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ride_recovery_actions_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ride_recovery_actions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ride_recovery_actions_previous_driver_id_fkey" FOREIGN KEY ("previous_driver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ride_recovery_actions_replacement_driver_id_fkey" FOREIGN KEY ("replacement_driver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ride_recovery_actions_idempotency_key_key" ON "ride_recovery_actions"("idempotency_key");
CREATE INDEX "ride_recovery_actions_ride_id_created_at_idx" ON "ride_recovery_actions"("ride_id", "created_at");
CREATE INDEX "ride_recovery_actions_replacement_driver_id_idx" ON "ride_recovery_actions"("replacement_driver_id");

CREATE TABLE "ride_fare_ledger" (
  "id" UUID NOT NULL,
  "ride_id" UUID NOT NULL,
  "actor_user_id" UUID,
  "entry_type" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
  "reference" TEXT,
  "metadata" JSONB,
  "idempotency_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ride_fare_ledger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ride_fare_ledger_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ride_fare_ledger_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ride_fare_ledger_idempotency_key_key" ON "ride_fare_ledger"("idempotency_key");
CREATE INDEX "ride_fare_ledger_ride_id_created_at_idx" ON "ride_fare_ledger"("ride_id", "created_at");
