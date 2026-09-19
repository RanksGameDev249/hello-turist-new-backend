-- The product state machine requires interrupted rides and a durable interruption event.
ALTER TYPE "RideStatus" ADD VALUE IF NOT EXISTS 'INTERRUPTED';
ALTER TYPE "RideEventType" ADD VALUE IF NOT EXISTS 'INTERRUPTED';
