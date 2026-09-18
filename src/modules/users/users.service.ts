import { prisma } from "../../core/prisma";

const userSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  phone: true,
  profileImageUrl: true,
  status: true,
  preferredLanguage: true,
  createdAt: true,
  updatedAt: true,
  roles: {
    select: {
      role: true,
      verificationStatus: true,
    },
  },
};

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: userSelect });
  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
}

export async function updateCurrentUser(
  userId: string,
  input: { name?: string; phone?: string; preferredLanguage?: string; profileImageUrl?: string }
) {
  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) throw new Error("USER_NOT_FOUND");

  if (input.phone) {
    const owner = await prisma.user.findUnique({ where: { phone: input.phone }, select: { id: true } });
    if (owner && owner.id !== userId) throw new Error("PHONE_ALREADY_REGISTERED");
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.preferredLanguage !== undefined && { preferredLanguage: input.preferredLanguage }),
      ...(input.profileImageUrl !== undefined && { profileImageUrl: input.profileImageUrl }),
    },
    select: userSelect,
  });
}

export async function getUserRoles(userId: string) {
  return prisma.userRoleAssignment.findMany({
    where: { userId },
    select: { role: true, verificationStatus: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function addUserRole(userId: string, role: "RIDER" | "DRIVER" | "GUIDE") {
  const existingRole = await prisma.userRoleAssignment.findUnique({
    where: { userId_role: { userId, role } },
    select: { role: true, verificationStatus: true, createdAt: true },
  });
  if (existingRole) return existingRole;

  return prisma.userRoleAssignment.create({
    data: { userId, role },
    select: { role: true, verificationStatus: true, createdAt: true },
  });
}

export async function updateUserRole(
  userId: string,
  role: "RIDER" | "DRIVER" | "GUIDE",
  verificationStatus: "PENDING" | "REJECTED"
) {
  const existingRole = await prisma.userRoleAssignment.findUnique({ where: { userId_role: { userId, role } } });
  if (!existingRole) throw new Error("ROLE_NOT_FOUND");

  return prisma.userRoleAssignment.update({
    where: { id: existingRole.id },
    data: { verificationStatus },
    select: { role: true, verificationStatus: true, createdAt: true },
  });
}
