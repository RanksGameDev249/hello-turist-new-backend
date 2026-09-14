import { prisma } from "../../core/prisma";

export async function updateRoleVerification(
  userId: string,
  role: "DRIVER" | "GUIDE",
  verificationStatus: "APPROVED" | "REJECTED"
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      roles: {
        where: {
          role,
        },
        select: {
          role: true,
          verificationStatus: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.roles.length === 0) {
    throw new Error("ROLE_NOT_FOUND");
  }

  const updatedRole = await prisma.userRoleAssignment.update({
    where: {
      userId_role: {
        userId,
        role,
      },
    },
    data: {
      verificationStatus,
    },
    select: {
      role: true,
      verificationStatus: true,
      createdAt: true,
    },
  });

  return {
    user: {
      id: user.id,
      username: user.username,
    },
    role: updatedRole,
  };
}