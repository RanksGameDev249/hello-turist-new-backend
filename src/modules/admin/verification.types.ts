export type AdminVerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AdminVerificationRequest {
  id: string;
  userId: string;
  role: string;
  status: AdminVerificationStatus;
  reason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
