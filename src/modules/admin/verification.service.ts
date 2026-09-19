import { prisma } from "../../core/prisma";

export async function listVerificationRequests(input: { page: number; limit: number; status?: string }) {
  const where = input.status ? { status: input.status as any } : {};
  const [items, total] = await Promise.all([
    prisma.verificationRequest.findMany({
      where,
      include: { user: { select: { id: true, name: true, username: true, email: true } }, steps: true, documents: true, liveSession: true },
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.verificationRequest.count({ where }),
  ]);
  return { items, pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) } };
}

export async function getVerificationRequest(id: string) {
  return prisma.verificationRequest.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, username: true, email: true } }, steps: true, documents: true, liveSession: true },
  });
}

export async function updateVerificationRequest(id: string, status: "APPROVED" | "REJECTED", reason?: string) {
  const dbStatus = status === "APPROVED" ? "VERIFIED" : "REJECTED";
  return prisma.verificationRequest.update({
    where: { id },
    data: { status: dbStatus, rejectionReason: status === "REJECTED" ? reason ?? null : null, reviewedAt: new Date() },
    include: { user: { select: { id: true, name: true, username: true, email: true } }, steps: true, documents: true, liveSession: true },
  });
}
