ALTER TABLE "trusted_contacts" ADD COLUMN "invitee_user_id" UUID;
ALTER TABLE "trusted_contacts" ADD CONSTRAINT "trusted_contacts_invitee_user_fkey" FOREIGN KEY ("invitee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "trusted_contacts_invitee_idx" ON "trusted_contacts"("invitee_user_id");
