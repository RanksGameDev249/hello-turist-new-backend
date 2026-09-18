import { prisma } from "../../core/prisma";

export async function listVerificationRequests(input: { page: number; limit: number; status?: string }) {
  const where = input.status ? { status: input.status as any } : {};
  const [items, total] = await Promise.all([
    prisma.verificationRequest.findMany({ where, orderBy: { createdAt: "desc" }, skip: (input.page - 1) * input.limit, take: input.limit }),
    prisma.verificationRequest.count({ where }),
  ]);
  return { items, pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) } };
}

export async function getVerificationRequest(id: string) {
  return prisma.verificationRequest.findUnique({ where: { id } });
}

export async function updateVerificationRequest(id: string, status: "APPROVED" | "REJECTED", reason?: string) {
  return prisma.verificationRequest.update({ where: { id }, data: { status, reason: reason ?? null } });
}
