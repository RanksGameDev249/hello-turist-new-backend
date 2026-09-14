import { z } from "zod";

export const createSupportTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(1).max(5000),
  category: z.string().trim().min(2).max(50).default("GENERAL"),
});

export const ticketIdSchema = z.object({ id: z.string().uuid() });

export const addSupportMessageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
});

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
export type AddSupportMessageInput = z.infer<typeof addSupportMessageSchema>;
