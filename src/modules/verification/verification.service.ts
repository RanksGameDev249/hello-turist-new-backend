import { prisma } from "../../core/prisma";

type ProviderRole = "DRIVER" | "GUIDE";
type LiveSessionStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

const providerRoles: ProviderRole[] = ["DRIVER", "GUIDE"];

function assertProviderRole(role: string): asserts role is ProviderRole {
  if (!providerRoles.includes(role as ProviderRole)) {
    throw new Error("INVALID_ROLE");
  }
}

function isEditableStatus(status: string) {
  return status === "PENDING" || status === "REJECTED" || status === "RESUBMITTED";
}

async function getRequestForUser(userId: string, requestId: string) {
  const request = await prisma.verificationRequest.findFirst({
    where: { id: requestId, userId },
    include: {
      steps: { orderBy: { createdAt: "asc" } },
      documents: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          documentType: true,
          checksum: true,
          expiryDate: true,
          verificationStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      liveSession: true,
    },
  });

  if (!request) throw new Error("VERIFICATION_REQUEST_NOT_FOUND");
  return request;
}

function toPublicRequest(request: Awaited<ReturnType<typeof getRequestForUser>>) {
  return {
    id: request.id,
    role: request.role,
    status: request.status,
    rejectionReason: request.rejectionReason,
    submittedAt: request.submittedAt,
    reviewedAt: request.reviewedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    steps: request.steps,
    documents: request.documents,
    liveSession: request.liveSession,
  };
}

export async function createVerificationRequest(userId: string, role: ProviderRole) {
  assertProviderRole(role);

  const assignment = await prisma.userRoleAssignment.findUnique({
    where: { userId_role: { userId, role } },
    select: { verificationStatus: true },
  });

  if (!assignment) throw new Error("ROLE_NOT_FOUND");
  if (assignment.verificationStatus === "APPROVED") {
    throw new Error("ROLE_ALREADY_VERIFIED");
  }

  const activeRequest = await prisma.verificationRequest.findFirst({
    where: {
      userId,
      role,
      status: { in: ["PENDING", "UNDER_VERIFICATION", "RESUBMITTED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (activeRequest) throw new Error("VERIFICATION_REQUEST_EXISTS");

  const request = await prisma.verificationRequest.create({
    data: {
      userId,
      role,
      status: "PENDING",
      steps: {
        create: [
          { step: "PROFILE", status: "PENDING" },
          { step: "DOCUMENTS", status: "PENDING" },
          { step: "LIVE_SESSION", status: "PENDING" },
          { step: "REVIEW", status: "PENDING" },
        ],
      },
    },
    include: {
      steps: { orderBy: { createdAt: "asc" } },
      documents: true,
      liveSession: true,
    },
  });

  return toPublicRequest(request as Awaited<ReturnType<typeof getRequestForUser>>);
}

export async function getVerificationRequest(userId: string, requestId: string) {
  const request = await getRequestForUser(userId, requestId);
  return toPublicRequest(request);
}

export async function addVerificationDocument(
  userId: string,
  requestId: string,
  input: {
    documentType: string;
    privateObjectKey: string;
    checksum?: string;
    expiryDate?: Date;
  }
) {
  const request = await prisma.verificationRequest.findFirst({
    where: { id: requestId, userId },
    select: { id: true, status: true },
  });

  if (!request) throw new Error("VERIFICATION_REQUEST_NOT_FOUND");
  if (!isEditableStatus(request.status)) throw new Error("VERIFICATION_REQUEST_LOCKED");

  const document = await prisma.verificationDocument.create({
    data: {
      verificationRequestId: request.id,
      documentType: input.documentType,
      privateObjectKey: input.privateObjectKey,
      checksum: input.checksum,
      expiryDate: input.expiryDate,
      verificationStatus: "PENDING",
    },
    select: {
      id: true,
      documentType: true,
      checksum: true,
      expiryDate: true,
      verificationStatus: true,
      createdAt: true,
    },
  });

  await prisma.verificationStep.update({
    where: {
      verificationRequestId_step: {
        verificationRequestId: request.id,
        step: "DOCUMENTS",
      },
    },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  return document;
}

export async function createOrUpdateLiveSession(
  userId: string,
  requestId: string,
  input: {
    providerReference: string;
    status: LiveSessionStatus;
    startedAt?: Date;
    completedAt?: Date;
  }
) {
  const request = await prisma.verificationRequest.findFirst({
    where: { id: requestId, userId },
    select: { id: true, status: true },
  });

  if (!request) throw new Error("VERIFICATION_REQUEST_NOT_FOUND");
  if (!isEditableStatus(request.status)) throw new Error("VERIFICATION_REQUEST_LOCKED");

  const liveSession = await prisma.verificationLiveSession.upsert({
    where: { verificationRequestId: request.id },
    update: {
      providerReference: input.providerReference,
      status: input.status,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
    },
    create: {
      verificationRequestId: request.id,
      providerReference: input.providerReference,
      status: input.status,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
    },
  });

  await prisma.verificationStep.update({
    where: {
      verificationRequestId_step: {
        verificationRequestId: request.id,
        step: "LIVE_SESSION",
      },
    },
    data: {
      status: input.status === "COMPLETED" ? "COMPLETED" : input.status === "FAILED" ? "FAILED" : "IN_PROGRESS",
      completedAt: input.status === "COMPLETED" ? new Date() : null,
    },
  });

  return {
    id: liveSession.id,
    providerReference: liveSession.providerReference,
    status: liveSession.status,
    startedAt: liveSession.startedAt,
    completedAt: liveSession.completedAt,
  };
}

export async function resubmitVerification(userId: string, requestId: string) {
  const request = await prisma.verificationRequest.findFirst({
    where: { id: requestId, userId },
    include: {
      documents: { select: { id: true, verificationStatus: true } },
      liveSession: { select: { status: true } },
    },
  });

  if (!request) throw new Error("VERIFICATION_REQUEST_NOT_FOUND");
  if (request.status !== "REJECTED") throw new Error("RESUBMISSION_NOT_ALLOWED");

  const result = await prisma.$transaction(async (tx) => {
    await tx.verificationRequest.update({
      where: { id: request.id },
      data: {
        status: "RESUBMITTED",
        rejectionReason: null,
        submittedAt: new Date(),
        reviewedAt: null,
      },
    });

    await tx.verificationStep.updateMany({
      where: { verificationRequestId: request.id },
      data: { status: "PENDING", completedAt: null },
    });

    await tx.verificationDocument.updateMany({
      where: { verificationRequestId: request.id },
      data: { verificationStatus: "PENDING" },
    });

    return tx.verificationRequest.findUniqueOrThrow({
      where: { id: request.id },
      include: {
        steps: { orderBy: { createdAt: "asc" } },
        documents: {
          select: {
            id: true,
            documentType: true,
            checksum: true,
            expiryDate: true,
            verificationStatus: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
        liveSession: true,
      },
    });
  });

  return toPublicRequest(result as Awaited<ReturnType<typeof getRequestForUser>>);
}

export async function submitVerificationForReview(userId: string, requestId: string) {
  const request = await prisma.verificationRequest.findFirst({
    where: { id: requestId, userId },
    include: {
      documents: true,
      liveSession: true,
    },
  });

  if (!request) throw new Error("VERIFICATION_REQUEST_NOT_FOUND");
  if (!isEditableStatus(request.status)) throw new Error("VERIFICATION_REQUEST_LOCKED");
  if (request.documents.length === 0) throw new Error("DOCUMENTS_REQUIRED");
  if (!request.liveSession || request.liveSession.status !== "COMPLETED") {
    throw new Error("LIVE_SESSION_REQUIRED");
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.verificationRequest.update({
      where: { id: request.id },
      data: {
        status: "UNDER_VERIFICATION",
        submittedAt: new Date(),
      },
    });

    await tx.verificationStep.updateMany({
      where: { verificationRequestId: request.id },
      data: { status: "IN_PROGRESS" },
    });

    return tx.verificationRequest.findUniqueOrThrow({
      where: { id: request.id },
      include: {
        steps: { orderBy: { createdAt: "asc" } },
        documents: {
          select: {
            id: true,
            documentType: true,
            checksum: true,
            expiryDate: true,
            verificationStatus: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
        liveSession: true,
      },
    });
  });

  return toPublicRequest(updated as Awaited<ReturnType<typeof getRequestForUser>>);
}
