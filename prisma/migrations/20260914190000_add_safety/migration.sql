CREATE TYPE "TrustedContactConsentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');
CREATE TYPE "EmergencyIncidentState" AS ENUM ('TRIGGERED', 'ACKNOWLEDGED', 'RESPONDER_ASSIGNED', 'RESPONDER_EN_ROUTE', 'RESPONDER_ARRIVED', 'ESCALATED', 'RESOLVED');

CREATE TABLE "trusted_contacts" (
  "id" UUID NOT NULL,
  "owner_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "consent_status" "TrustedContactConsentStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "trusted_contacts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "trusted_contacts_owner_id_idx" ON "trusted_contacts"("owner_id");
CREATE INDEX "trusted_contacts_owner_id_consent_status_idx" ON "trusted_contacts"("owner_id", "consent_status");
ALTER TABLE "trusted_contacts" ADD CONSTRAINT "trusted_contacts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "shared_trips" (
  "id" UUID NOT NULL,
  "ride_id" UUID NOT NULL,
  "contact_id" UUID NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "shared_trips_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "shared_trips_ride_id_idx" ON "shared_trips"("ride_id");
CREATE INDEX "shared_trips_contact_id_expires_at_idx" ON "shared_trips"("contact_id", "expires_at");
ALTER TABLE "shared_trips" ADD CONSTRAINT "shared_trips_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shared_trips" ADD CONSTRAINT "shared_trips_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "trusted_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "emergency_incidents" (
  "id" UUID NOT NULL,
  "rider_id" UUID NOT NULL,
  "ride_id" UUID,
  "category" TEXT NOT NULL,
  "state" "EmergencyIncidentState" NOT NULL DEFAULT 'TRIGGERED',
  "trigger_source" TEXT NOT NULL,
  "location_snapshot" JSONB,
  "heartbeat_snapshot" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledged_at" TIMESTAMP(3),
  "escalated_at" TIMESTAMP(3),
  "resolved_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "emergency_incidents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "emergency_incidents_rider_id_created_at_idx" ON "emergency_incidents"("rider_id", "created_at");
CREATE INDEX "emergency_incidents_ride_id_idx" ON "emergency_incidents"("ride_id");
CREATE INDEX "emergency_incidents_state_created_at_idx" ON "emergency_incidents"("state", "created_at");
ALTER TABLE "emergency_incidents" ADD CONSTRAINT "emergency_incidents_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "emergency_incidents" ADD CONSTRAINT "emergency_incidents_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "emergency_events" (
  "id" UUID NOT NULL,
  "incident_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "emergency_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "emergency_events_incident_id_occurred_at_idx" ON "emergency_events"("incident_id", "occurred_at");
ALTER TABLE "emergency_events" ADD CONSTRAINT "emergency_events_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "emergency_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "emergency_responders" (
  "id" UUID NOT NULL,
  "incident_id" UUID NOT NULL,
  "responder_id" UUID NOT NULL,
  "status" TEXT NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "arrived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "emergency_responders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "emergency_responders_incident_id_status_idx" ON "emergency_responders"("incident_id", "status");
CREATE INDEX "emergency_responders_responder_id_status_idx" ON "emergency_responders"("responder_id", "status");
ALTER TABLE "emergency_responders" ADD CONSTRAINT "emergency_responders_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "emergency_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "emergency_responders" ADD CONSTRAINT "emergency_responders_responder_id_fkey" FOREIGN KEY ("responder_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
