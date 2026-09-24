import { prisma } from "../../core/prisma";
import { isSupportedLanguage } from "../language/language.catalog";

async function avatarFor(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ avatar_url: string | null }>>`SELECT avatar_url FROM user_profile_media WHERE user_id=${userId}::uuid LIMIT 1`;
  return rows[0]?.avatar_url ?? null;
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id:true,name:true,username:true,email:true,phone:true,status:true,preferredLanguage:true,createdAt:true,updatedAt:true,roles:{select:{role:true,verificationStatus:true}} } });
  if (!user) throw new Error("USER_NOT_FOUND");
  const avatarUrl = await avatarFor(userId);
  const basicProfileComplete = user.name.trim().length >= 2 && !!avatarUrl;
  return {
    ...user,
    avatarUrl,
    profileImageUrl: avatarUrl,
    profileCompleted: basicProfileComplete && user.roles.length > 0,
    profileCompletion: { basicProfileComplete, roleSelected: user.roles.length > 0, nextRole: user.roles[0]?.role ?? null },
  };
}

export async function updateCurrentUser(userId: string, input: { name?: string; preferredLanguage?: string; avatarUrl?: string | null }) {
  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) throw new Error("USER_NOT_FOUND");
  if (input.preferredLanguage !== undefined && !isSupportedLanguage(input.preferredLanguage)) throw new Error("UNSUPPORTED_LANGUAGE");
  const user = await prisma.user.update({ where: { id: userId }, data: { ...(input.name !== undefined && { name: input.name }), ...(input.preferredLanguage !== undefined && { preferredLanguage: input.preferredLanguage }) }, select: { id:true,name:true,username:true,email:true,phone:true,status:true,preferredLanguage:true,createdAt:true,updatedAt:true,roles:{select:{role:true,verificationStatus:true}} } });
  if (input.avatarUrl !== undefined) {
    await prisma.$executeRaw`INSERT INTO user_profile_media (user_id,avatar_url,updated_at) VALUES (${userId}::uuid,${input.avatarUrl},NOW()) ON CONFLICT (user_id) DO UPDATE SET avatar_url=EXCLUDED.avatar_url,updated_at=NOW()`;
  }
  const avatarUrl = await avatarFor(userId);
  const basicProfileComplete = user.name.trim().length >= 2 && !!avatarUrl;
  return {
    ...user,
    avatarUrl,
    profileImageUrl: avatarUrl,
    profileCompleted: basicProfileComplete && user.roles.length > 0,
    profileCompletion: { basicProfileComplete, roleSelected: user.roles.length > 0, nextRole: user.roles[0]?.role ?? null },
  };
}

export async function updatePreferredLanguage(userId: string, preferredLanguage: string) {
  if (!isSupportedLanguage(preferredLanguage)) throw new Error("UNSUPPORTED_LANGUAGE");
  const user = await prisma.user.update({ where: { id: userId }, data: { preferredLanguage }, select: { id: true, preferredLanguage: true } });
  return user;
}

export async function getUserRoles(userId: string) {
  return prisma.userRoleAssignment.findMany({ where: { userId }, select: { role:true,verificationStatus:true,createdAt:true }, orderBy: { createdAt:"asc" } });
}
export async function addUserRole(userId: string, role: "RIDER" | "DRIVER" | "GUIDE") {
  const existingRole = await prisma.userRoleAssignment.findUnique({ where:{ userId_role:{userId,role} }, select:{role:true,verificationStatus:true,createdAt:true} });
  if (existingRole) return existingRole;
  return prisma.userRoleAssignment.create({ data:{userId,role}, select:{role:true,verificationStatus:true,createdAt:true} });
}
export async function updateUserRole(userId:string,role:"RIDER"|"DRIVER"|"GUIDE",verificationStatus:"PENDING"|"REJECTED") {
  const existingRole=await prisma.userRoleAssignment.findUnique({where:{userId_role:{userId,role}}});
  if(!existingRole)throw new Error("ROLE_NOT_FOUND");
  return prisma.userRoleAssignment.update({where:{id:existingRole.id},data:{verificationStatus},select:{role:true,verificationStatus:true,createdAt:true}});
}
