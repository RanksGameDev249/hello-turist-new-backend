-- DropForeignKey
ALTER TABLE "emergency_events" DROP CONSTRAINT "emergency_events_incident_id_fkey";

-- DropForeignKey
ALTER TABLE "emergency_incidents" DROP CONSTRAINT "emergency_incidents_ride_id_fkey";

-- DropForeignKey
ALTER TABLE "emergency_incidents" DROP CONSTRAINT "emergency_incidents_rider_id_fkey";

-- DropForeignKey
ALTER TABLE "emergency_responders" DROP CONSTRAINT "emergency_responders_incident_id_fkey";

-- DropForeignKey
ALTER TABLE "emergency_responders" DROP CONSTRAINT "emergency_responders_responder_id_fkey";

-- DropForeignKey
ALTER TABLE "shared_trips" DROP CONSTRAINT "shared_trips_contact_id_fkey";

-- DropForeignKey
ALTER TABLE "shared_trips" DROP CONSTRAINT "shared_trips_ride_id_fkey";

-- DropForeignKey
ALTER TABLE "trusted_contacts" DROP CONSTRAINT "trusted_contacts_owner_id_fkey";
