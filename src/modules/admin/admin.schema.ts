import { z } from "zod";

export const updateRoleVerificationSchema = z.object({
  verificationStatus: z.enum(["APPROVED", "REJECTED"]),
});

export const verificationDecisionSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  rejectionReason: z.string().trim().min(2).max(500).optional(),
}).superRefine((data, ctx) => {
  if (data.status === "REJECTED" && !data.rejectionReason) {
    ctx.addIssue({
      code: "custom",
      path: ["rejectionReason"],
      message: "Rejection reason is required",
    });
  }
});
