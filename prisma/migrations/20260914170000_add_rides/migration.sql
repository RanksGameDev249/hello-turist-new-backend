CREATE TYPE "RideStatus" AS ENUM ('REQUESTED', 'SEARCHING', 'ASSIGNED', 'DRIVER_ARRIVING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "RideAssignmentStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED');
CREATE TYPE "RideEventType" AS ENUM ('CREATED', 'SEARCH_STARTED', 'DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'DRIVER_REJECTED', 'DRIVER_ARRIVING', 'RIDE_STARTED', 'RIDE_COMPLETED', 'CANCELLED', 'LOCATION_RECORDED');

CREATE TABLE "rides" (
  "id" UUID NOT NULL,
  "rider_id" UUID NOT NULL,
  "pickup_address" TEXT NOT NULL,
  "pickup_latitude" DECIMAL(10,7) NOT NULL,
  "pickup_longitude" DECIMAL(10,7) NOT NULL,
  "dropoff_address" TEXT NOT NULL,
  "dropoff_latitude" DECIMAL(10,7) NOT NULL,
  "dropoff_longitude" DECIMAL(10,7) NOT NULL,
  "scheduled_at" TIMESTAMP(3),
  "status" "RideStatus" NOT NULL DEFAULT 'REQUESTED',
  "notes" TEXT,
  "cancelled_at" TIMESTAMP(3),
  "cancellation_reason" TEXT,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rides_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ride_assignments" (
  "id" UUID NOT NULL,
  "ride_id" UUID NOT NULL,
  "driver_id" UUID NOT NULL,
  "status" "RideAssignmentStatus" NOT NULL DEFAULT 'OFFERED',
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at" TIMESTAMP(3),
  "rejected_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ride_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ride_events" (
  "id" UUID NOT NULL,
  "ride_id" UUID NOT NULL,
  "actor_user_id" UUID,
  "type" "RideEventType" NOT NULL,
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ride_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ride_locations" (
  "id" UUID NOT NULL,
  "ride_id" UUID NOT NULL,
  "driver_id" UUID,
  "latitude" DECIMAL(10,7) NOT NULL,
  "longitude" DECIMAL(10,7) NOT NULL,
  "accuracy" DECIMAL(10,2),
  "recorded_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ride_locations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rides_rider_id_created_at_idx" ON "rides"("rider_id", "created_at");
CREATE INDEX "rides_status_idx" ON "rides"("status");
CREATE INDEX "rides_scheduled_at_idx" ON "rides"("scheduled_at");
CREATE INDEX "ride_assignments_ride_id_status_idx" ON "ride_assignments"("ride_id", "status");
CREATE INDEX "ride_assignments_driver_id_status_idx" ON "ride_assignments"("driver_id", "status");
CREATE INDEX "ride_events_ride_id_created_at_idx" ON "ride_events"("ride_id", "created_at");
CREATE INDEX "ride_locations_ride_id_recorded_at_idx" ON "ride_locations"("ride_id", "recorded_at");

ALTER TABLE "rides" ADD CONSTRAINT "rides_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ride_assignments" ADD CONSTRAINT "ride_assignments_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ride_assignments" ADD CONSTRAINT "ride_assignments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ride_events" ADD CONSTRAINT "ride_events_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ride_events" ADD CONSTRAINT "ride_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ride_locations" ADD CONSTRAINT "ride_locations_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ride_locations" ADD CONSTRAINT "ride_locations_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
