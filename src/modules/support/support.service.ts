import { prisma } from "../../core/prisma";
import type { AddSupportMessageInput, CreateSupportTicketInput } from "./support.schema";

export async function createTicket(userId: string, input: CreateSupportTicketInput) {
  return prisma.supportTicket.create({
    data: {
      userId,
      subject: input.subject,
      category: input.category,
      messages: { create: { userId, message: input.message, isStaff: false } },
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function listTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId }, orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function getTicket(userId: string, id: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId }, include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) throw new Error("TICKET_NOT_FOUND");
  return ticket;
}

export async function addMessage(userId: string, id: string, input: AddSupportMessageInput) {
  const ticket = await prisma.supportTicket.findFirst({ where: { id, userId }, select: { id: true, status: true } });
  if (!ticket) throw new Error("TICKET_NOT_FOUND");
  if (ticket.status === "CLOSED") throw new Error("TICKET_CLOSED");
  return prisma.supportTicketMessage.create({ data: { ticketId: id, userId, message: input.message, isStaff: false } });
}
