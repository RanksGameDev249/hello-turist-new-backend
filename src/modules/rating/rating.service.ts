import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../core/prisma";
import type { CreateRatingInput } from "./rating.schema";

type RatingRow = {
  id: string;
  ride_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function createRideRating(userId: string, rideId: string, input: CreateRatingInput) {
  return prisma.$transaction(async (tx) => {
    const rides = await tx.$queryRaw<Array<{ id: string; rider_id: string; status: string }>>(Prisma.sql`
      SELECT id, rider_id, status::text AS status
      FROM rides
      WHERE id = ${rideId}::uuid
      LIMIT 1
    `);
    const ride = rides[0];
    if (!ride) throw new Error("RIDE_NOT_FOUND");
    if (ride.status !== "COMPLETED") throw new Error("RIDE_NOT_COMPLETED");

    const assignments = await tx.$queryRaw<Array<{ driver_id: string }>>(Prisma.sql`
      SELECT driver_id
      FROM ride_assignments
      WHERE ride_id = ${rideId}::uuid AND status::text = 'ACCEPTED'
      ORDER BY accepted_at DESC NULLS LAST, created_at DESC
      LIMIT 1
    `);
    const assignment = assignments[0];
    if (!assignment) throw new Error("RIDE_PROVIDER_NOT_FOUND");

    let revieweeId: string;
    if (userId === ride.rider_id) {
      revieweeId = assignment.driver_id;
    } else if (userId === assignment.driver_id) {
      revieweeId = ride.rider_id;
    } else {
      throw new Error("RATING_NOT_ALLOWED");
    }

    const existing = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM ratings
      WHERE ride_id = ${rideId}::uuid AND reviewer_id = ${userId}::uuid
      LIMIT 1
    `);
    if (existing[0]) throw new Error("RATING_ALREADY_EXISTS");

    const rows = await tx.$queryRaw<RatingRow[]>(Prisma.sql`
      INSERT INTO ratings (id, ride_id, reviewer_id, reviewee_id, rating, comment, created_at, updated_at)
      VALUES (gen_random_uuid(), ${rideId}::uuid, ${userId}::uuid, ${revieweeId}::uuid, ${input.rating}, ${input.comment ?? null}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, ride_id, reviewer_id, reviewee_id, rating, comment, created_at, updated_at
    `);

    return rows[0];
  });
}

export async function listGivenRatings(userId: string) {
  return prisma.$queryRaw<RatingRow[]>(Prisma.sql`
    SELECT id, ride_id, reviewer_id, reviewee_id, rating, comment, created_at, updated_at
    FROM ratings
    WHERE reviewer_id = ${userId}::uuid
    ORDER BY created_at DESC
  `);
}

export async function listReceivedRatings(userId: string) {
  return prisma.$queryRaw<RatingRow[]>(Prisma.sql`
    SELECT id, ride_id, reviewer_id, reviewee_id, rating, comment, created_at, updated_at
    FROM ratings
    WHERE reviewee_id = ${userId}::uuid
    ORDER BY created_at DESC
  `);
}

export async function getRatingSummary(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ average: number | null; count: bigint }>>(Prisma.sql`
    SELECT AVG(rating)::float8 AS average, COUNT(*)::bigint AS count
    FROM ratings
    WHERE reviewee_id = ${userId}::uuid
  `);
  return {
    averageRating: rows[0]?.average ?? null,
    totalRatings: Number(rows[0]?.count ?? 0),
  };
}
