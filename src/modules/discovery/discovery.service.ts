import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../core/prisma";
import type { CreateCuratedPlaceInput, UpdateCuratedPlaceInput } from "./discovery.schema";

const columns = `id, type, name, description, history, address, city, latitude, longitude, images, amenities, price_from AS "priceFrom", phone, website, sponsor_name AS "sponsorName", is_featured AS "isFeatured", is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function listPublishedDiscovery(params: { type?: string; city?: string; limit: number }) {
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT ${Prisma.raw(columns)}
    FROM curated_places
    WHERE is_active = true
      AND (${params.type ?? null}::text IS NULL OR type = ${params.type ?? null})
      AND (${params.city ?? null}::text IS NULL OR city ILIKE ${params.city ? `%${params.city}%` : null})
    ORDER BY is_featured DESC, created_at DESC
    LIMIT ${params.limit}
  `);
}

export async function getCuratedPlace(id: string) {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`SELECT ${Prisma.raw(columns)} FROM curated_places WHERE id = ${id}::uuid`);
  if (!rows[0]) throw new Error("CURATED_PLACE_NOT_FOUND");
  return rows[0];
}

export async function createCuratedPlace(input: CreateCuratedPlaceInput, adminUserId: string) {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    INSERT INTO curated_places (type, name, description, history, address, city, latitude, longitude, images, amenities, price_from, phone, website, sponsor_name, is_featured, is_active, created_by)
    VALUES (${input.type}, ${input.name}, ${input.description ?? null}, ${input.history ?? null}, ${input.address}, ${input.city ?? null}, ${input.latitude}, ${input.longitude}, ${JSON.stringify(input.images)}::jsonb, ${JSON.stringify(input.amenities)}::jsonb, ${input.priceFrom ?? null}, ${input.phone ?? null}, ${input.website ?? null}, ${input.sponsorName ?? null}, ${input.isFeatured}, ${input.isActive}, ${adminUserId}::uuid)
    RETURNING ${Prisma.raw(columns)}
  `);
  return rows[0];
}

export async function updateCuratedPlace(id: string, input: UpdateCuratedPlaceInput) {
  const map: Record<string, string> = {
    type: "type", name: "name", description: "description", history: "history", address: "address", city: "city",
    latitude: "latitude", longitude: "longitude", images: "images", amenities: "amenities", priceFrom: "price_from",
    phone: "phone", website: "website", sponsorName: "sponsor_name", isFeatured: "is_featured", isActive: "is_active",
  };
  const entries = Object.entries(input).filter(([, value]) => value !== undefined);
  if (!entries.length) return getCuratedPlace(id);
  const sets = entries.map(([key], index) => `"${map[key]}" = $${index + 2}`).join(", ");
  const values = entries.map(([key, value]) => key === "images" || key === "amenities" ? JSON.stringify(value) : value);
  const jsonKeys = new Set(["images", "amenities"]);
  const casts = entries.map(([key], index) => jsonKeys.has(key) ? `$${index + 2}::jsonb` : `$${index + 2}`).join(", ");
  const safeSets = entries.map(([key], index) => `"${map[key]}" = ${jsonKeys.has(key) ? `$${index + 2}::jsonb` : `$${index + 2}`}`).join(", ");
  const rows = await prisma.$queryRawUnsafe<any[]>(`UPDATE curated_places SET ${safeSets}, updated_at = NOW() WHERE id = $1::uuid RETURNING ${columns}`, id, ...values);
  void casts;
  if (!rows[0]) throw new Error("CURATED_PLACE_NOT_FOUND");
  return rows[0];
}

export async function deleteCuratedPlace(id: string) {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`UPDATE curated_places SET is_active = false, updated_at = NOW() WHERE id = ${id}::uuid RETURNING id, is_active AS "isActive"`);
  if (!rows[0]) throw new Error("CURATED_PLACE_NOT_FOUND");
  return rows[0];
}
