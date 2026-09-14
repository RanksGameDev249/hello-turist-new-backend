import { prisma } from "../../core/prisma";

const driverSelect = {
  id: true,
  userId: true,
  bio: true,
  experienceYears: true,
  serviceCity: true,
  serviceArea: true,
  profileImageKey: true,
  isAvailable: true,
  createdAt: true,
  updatedAt: true,
  vehicles: {
    where: { isActive: true },
    orderBy: { createdAt: "desc" as const },
  },
};

const guideSelect = {
  id: true,
  userId: true,
  bio: true,
  experienceYears: true,
  serviceCity: true,
  profileImageKey: true,
  languages: true,
  specialties: true,
  isAvailable: true,
  createdAt: true,
  updatedAt: true,
};

async function requireRole(userId: string, role: "DRIVER" | "GUIDE") {
  const assignment = await prisma.userRoleAssignment.findUnique({
    where: { userId_role: { userId, role } },
    select: { verificationStatus: true },
  });

  if (!assignment) throw new Error("ROLE_NOT_FOUND");
  return assignment;
}

export async function getDriverProfile(userId: string) {
  await requireRole(userId, "DRIVER");
  return prisma.driverProfile.findUnique({ where: { userId }, select: driverSelect });
}

export async function upsertDriverProfile(userId: string, data: Record<string, unknown>) {
  await requireRole(userId, "DRIVER");
  return prisma.driverProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
    select: driverSelect,
  });
}

export async function getGuideProfile(userId: string) {
  await requireRole(userId, "GUIDE");
  return prisma.guideProfile.findUnique({ where: { userId }, select: guideSelect });
}

export async function upsertGuideProfile(userId: string, data: Record<string, unknown>) {
  await requireRole(userId, "GUIDE");
  return prisma.guideProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
    select: guideSelect,
  });
}

async function requireDriverProfile(userId: string) {
  await requireRole(userId, "DRIVER");
  const profile = await prisma.driverProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) throw new Error("DRIVER_PROFILE_REQUIRED");
  return profile;
}

export async function createVehicle(userId: string, data: Record<string, unknown>) {
  const profile = await requireDriverProfile(userId);
  return prisma.vehicle.create({ data: { driverProfileId: profile.id, ...data } });
}

export async function listVehicles(userId: string) {
  const profile = await requireDriverProfile(userId);
  return prisma.vehicle.findMany({ where: { driverProfileId: profile.id }, orderBy: { createdAt: "desc" } });
}

export async function updateVehicle(userId: string, vehicleId: string, data: Record<string, unknown>) {
  const profile = await requireDriverProfile(userId);
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, driverProfileId: profile.id } });
  if (!vehicle) throw new Error("VEHICLE_NOT_FOUND");
  return prisma.vehicle.update({ where: { id: vehicleId }, data });
}

export async function deleteVehicle(userId: string, vehicleId: string) {
  const profile = await requireDriverProfile(userId);
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, driverProfileId: profile.id } });
  if (!vehicle) throw new Error("VEHICLE_NOT_FOUND");
  return prisma.vehicle.update({ where: { id: vehicleId }, data: { isActive: false } });
}
