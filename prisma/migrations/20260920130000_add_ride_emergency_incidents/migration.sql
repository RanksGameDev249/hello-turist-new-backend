CREATE TABLE "ride_emergency_incidents" (
  "id" UUID NOT NULL,
  "ride_id" UUID NOT NULL,
  "triggered_by" UUID NOT NULL,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "acknowledged_by" UUID,
  "acknowledged_at" TIMESTAMP(3),
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ride_emergency_incidents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ride_emergency_incidents_ride_id_status_idx" ON "ride_emergency_incidents"("ride_id", "status");
CREATE INDEX "ride_emergency_incidents_status_created_at_idx" ON "ride_emergency_incidents"("status", "created_at");

ALTER TABLE "ride_emergency_incidents" ADD CONSTRAINT "ride_emergency_incidents_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ride_emergency_incidents" ADD CONSTRAINT "ride_emergency_incidents_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ride_emergency_incidents" ADD CONSTRAINT "ride_emergency_incidents_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
