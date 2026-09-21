ALTER TABLE "rides"
  ADD COLUMN "service_type" TEXT NOT NULL DEFAULT 'RIDE_ONLY',
  ADD COLUMN "purpose" TEXT,
  ADD COLUMN "payment_method" TEXT NOT NULL DEFAULT 'RAZORPAY';

CREATE INDEX "rides_service_type_status_idx" ON "rides"("service_type", "status");

CREATE TABLE "guide_assignments" (
  "id" UUID NOT NULL,
  "ride_id" UUID NOT NULL,
  "guide_id" UUID NOT NULL,
  "status" "RideAssignmentStatus" NOT NULL DEFAULT 'OFFERED',
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at" TIMESTAMP(3),
  "rejected_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "guide_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "guide_assignments_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "guide_assignments_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "guide_assignments_ride_id_guide_id_key" ON "guide_assignments"("ride_id", "guide_id");
CREATE INDEX "guide_assignments_ride_id_status_idx" ON "guide_assignments"("ride_id", "status");
CREATE INDEX "guide_assignments_guide_id_status_idx" ON "guide_assignments"("guide_id", "status");

ALTER TYPE "RideStatus" ADD VALUE IF NOT EXISTS 'INTERRUPTED';
ALTER TYPE "RideEventType" ADD VALUE IF NOT EXISTS 'INTERRUPTED';
ALTER TYPE "RideEventType" ADD VALUE IF NOT EXISTS 'RECOVERY_STARTED';
ALTER TYPE "RideEventType" ADD VALUE IF NOT EXISTS 'RECOVERY_ASSIGNED';
