import { prisma } from "../../core/prisma";

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
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
    },
  });

  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
}

export async function updateCurrentUser(
  userId: string,
  input: { name?: string; preferredLanguage?: string }
) {
  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) throw new Error("USER_NOT_FOUND");

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.preferredLanguage !== undefined && {
        preferredLanguage: input.preferredLanguage,
      }),
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
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
    },
  });
}

export async function getUserRoles(userId: string) {
  return prisma.userRoleAssignment.findMany({
    where: { userId },
    select: {
      role: true,
      verificationStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function addUserRole(
  userId: string,
  role: "RIDER" | "DRIVER" | "GUIDE"
) {
  const existingRole = await prisma.userRoleAssignment.findUnique({
    where: {
      userId_role: { userId, role },
    },
    select: {
      role: true,
      verificationStatus: true,
      createdAt: true,
    },
  });

  // Onboarding can be retried safely. Selecting an existing role is idempotent.
  if (existingRole) return existingRole;

  return prisma.userRoleAssignment.create({
    data: { userId, role },
    select: {
      role: true,
      verificationStatus: true,
      createdAt: true,
    },
  });
}

export async function updateUserRole(
  userId: string,
  role: "RIDER" | "DRIVER" | "GUIDE",
  verificationStatus: "PENDING" | "REJECTED"
) {
  const existingRole = await prisma.userRoleAssignment.findUnique({
    where: { userId_role: { userId, role } },
  });

  if (!existingRole) throw new Error("ROLE_NOT_FOUND");

  return prisma.userRoleAssignment.update({
    where: { id: existingRole.id },
    data: { verificationStatus },
    select: {
      role: true,
      verificationStatus: true,
      createdAt: true,
    },
  });
}