-- DropForeignKey
ALTER TABLE "verification_live_sessions" DROP CONSTRAINT "verification_live_sessions_verification_request_id_fkey";

-- AlterTable
ALTER TABLE "verification_live_sessions" ALTER COLUMN "verification_request_id" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "verification_live_sessions" ADD CONSTRAINT "verification_live_sessions_verification_request_id_fkey" FOREIGN KEY ("verification_request_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
