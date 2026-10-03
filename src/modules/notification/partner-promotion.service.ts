import { Prisma, NotificationType } from "../../generated/prisma/client";
import { prisma } from "../../core/prisma";
import { createNotification } from "./notification.service";
import type { NearbyPartnerPromotionInput } from "./partner-promotion.schema";

type NearbyPlace = {
  id: string;
  type: string;
  name: string;
  address: string;
  city: string | null;
  latitude: number;
  longitude: number;
  priceFrom: number | null;
  website: string | null;
  sponsorName: string | null;
  isPartner: boolean;
  distanceKm: number;
};

function buildMessage(place: NearbyPlace) {
  const price = place.priceFrom != null ? ` Starting from ₹${Math.round(place.priceFrom)}.` : "";
  if (place.type === "HOMESTAY") return { title: "🏡 Homestay near you", body: `Featured homestay ${place.name} is nearby.${price}` };
  if (place.type === "HOTEL") return { title: "🏨 Hotel near you", body: `A partner hotel, ${place.name}, is available nearby.${price}` };
  if (place.type === "RESTAURANT") return { title: "🍽️ Hungry?", body: `Try partner restaurant ${place.name} near you.${price}` };
  return { title: "🍴 Food near you", body: `Food from partner ${place.name} is available nearby.${price}` };
}

export async function notifyNearbyPartners(userId: string, input: NearbyPartnerPromotionInput) {
  const types = input.types?.length ? input.types : ["HOMESTAY", "HOTEL", "RESTAURANT", "FOOD"];
  const radius = input.radiusKm;
  const lat = input.latitude;
  const lng = input.longitude;
  const rows = await prisma.$queryRaw<NearbyPlace[]>(Prisma.sql`
    SELECT id, type, name, address, city,
      latitude::double precision AS latitude,
      longitude::double precision AS longitude,
      price_from::double precision AS "priceFrom",
      website, sponsor_name AS "sponsorName",
      is_partner AS "isPartner",
      (6371 * acos(least(1, greatest(-1,
        cos(radians(${lat})) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(latitude))
      )))) AS "distanceKm"
    FROM curated_places
    WHERE is_active = true
      AND notification_enabled = true
      AND (is_partner = true OR sponsor_name IS NOT NULL)
      AND type IN (${Prisma.join(types)})
      AND latitude BETWEEN ${lat - radius / 111} AND ${lat + radius / 111}
      AND longitude BETWEEN ${lng - radius / 111} AND ${lng + radius / 111}
    ORDER BY is_featured DESC, "distanceKm" ASC
    LIMIT ${input.limit}
  `);

  const notified: NearbyPlace[] = [];
  for (const place of rows) {
    const recent = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM notifications
      WHERE user_id = ${userId}::uuid
        AND type = 'PARTNER_PROMOTION'
        AND data->>'placeId' = ${place.id}
        AND created_at > NOW() - INTERVAL '24 hours'
      LIMIT 1
    `);
    if (recent[0]) continue;
    const message = buildMessage(place);
    await createNotification(userId, {
      type: NotificationType.PARTNER_PROMOTION,
      title: message.title,
      body: message.body,
      data: {
        kind: "PARTNER_PROMOTION",
        placeId: place.id,
        placeType: place.type,
        placeName: place.name,
        sponsorName: place.sponsorName ?? null,
        website: place.website ?? null,
        latitude: place.latitude,
        longitude: place.longitude,
        distanceKm: Number(place.distanceKm.toFixed(2)),
      },
    });
    notified.push(place);
  }

  return { notificationsCreated: notified.length, places: notified };
}
