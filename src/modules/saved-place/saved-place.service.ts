import { prisma } from "../../core/prisma";
import type { CreateSavedPlaceInput, UpdateSavedPlaceInput } from "./saved-place.schema";

export async function createSavedPlace(userId: string, input: CreateSavedPlaceInput) {
  return prisma.savedPlace.create({
    data: {
      userId,
      name: input.name,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      placeId: input.placeId,
    },
  });
}

export async function listSavedPlaces(userId: string) {
  return prisma.savedPlace.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSavedPlace(userId: string, id: string) {
  const place = await prisma.savedPlace.findFirst({ where: { id, userId } });
  if (!place) throw new Error("SAVED_PLACE_NOT_FOUND");
  return place;
}

export async function updateSavedPlace(userId: string, id: string, input: UpdateSavedPlaceInput) {
  await getSavedPlace(userId, id);
  return prisma.savedPlace.update({ where: { id }, data: input });
}

export async function deleteSavedPlace(userId: string, id: string) {
  await getSavedPlace(userId, id);
  await prisma.savedPlace.delete({ where: { id } });
  return { deleted: true };
}
