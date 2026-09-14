import { z } from "zod";

export const updateRoleVerificationSchema = z.object({
  verificationStatus: z.enum(["APPROVED", "REJECTED"]),
});