-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'UNDER_VERIFICATION', 'VERIFIED', 'REJECTED', 'RESUBMITTED', 'SUSPENDED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "VerificationStepType" AS ENUM ('PROFILE', 'DOCUMENTS', 'LIVE_SESSION', 'REVIEW');

-- CreateEnum
CREATE TYPE "VerificationStepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_steps" (
    "id" UUID NOT NULL,
    "verification_request_id" UUID NOT NULL,
    "step" "VerificationStepType" NOT NULL,
    "status" "VerificationStepStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_documents" (
    "id" UUID NOT NULL,
    "verification_request_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "private_object_key" TEXT NOT NULL,
    "checksum" TEXT,
    "expiry_date" TIMESTAMP(3),
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_live_sessions" (
    "id" UUID NOT NULL,
    "verification_request_id" UUID NOT NULL,
    "provider_reference" TEXT NOT NULL,
    "status" "VerificationStepStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_live_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verification_requests_user_id_idx" ON "verification_requests"("user_id");
CREATE INDEX "verification_requests_status_idx" ON "verification_requests"("status");
CREATE INDEX "verification_requests_role_status_idx" ON "verification_requests"("role", "status");
CREATE UNIQUE INDEX "verification_steps_verification_request_id_step_key" ON "verification_steps"("verification_request_id", "step");
CREATE INDEX "verification_steps_verification_request_id_idx" ON "verification_steps"("verification_request_id");
CREATE INDEX "verification_documents_verification_request_id_idx" ON "verification_documents"("verification_request_id");
CREATE INDEX "verification_documents_verification_status_idx" ON "verification_documents"("verification_status");
CREATE UNIQUE INDEX "verification_live_sessions_verification_request_id_key" ON "verification_live_sessions"("verification_request_id");

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "verification_steps" ADD CONSTRAINT "verification_steps_verification_request_id_fkey" FOREIGN KEY ("verification_request_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_verification_request_id_fkey" FOREIGN KEY ("verification_request_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "verification_live_sessions" ADD CONSTRAINT "verification_live_sessions_verification_request_id_fkey" FOREIGN KEY ("verification_request_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
