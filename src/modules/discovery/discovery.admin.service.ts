import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../core/prisma";

export async function listAllCuratedPlaces(params: { type?: string; city?: string; limit: number }) {
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT id, type, name, description, history, address, city, latitude, longitude, images, amenities,
      price_from AS "priceFrom", phone, website, sponsor_name AS "sponsorName", is_featured AS "isFeatured",
      is_active AS "isActive", is_partner AS "isPartner", notification_enabled AS "notificationEnabled", created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"
    FROM curated_places
    WHERE (${params.type ?? null}::text IS NULL OR type = ${params.type ?? null})
      AND (${params.city ?? null}::text IS NULL OR city ILIKE ${params.city ? `%${params.city}%` : null})
    ORDER BY is_active DESC, is_featured DESC, created_at DESC
    LIMIT ${params.limit}
  `);
}
