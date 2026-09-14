import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { addSupportMessageSchema, createSupportTicketSchema, ticketIdSchema } from "./support.schema";
import { addMessage, createTicket, getTicket, listTickets } from "./support.service";

function fail(res: Response, requestId: string, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const map: Record<string, [number, string]> = {
    TICKET_NOT_FOUND: [404, "Support ticket not found"],
    TICKET_CLOSED: [409, "Support ticket is closed"],
  };
  const [status, message] = map[code] ?? [500, "Internal server error"];
  return errorResponse(res, requestId, status, code, message);
}

export async function createTicketController(req: Request, res: Response) {
  const parsed = createSupportTicketSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid support ticket", parsed.error.flatten());
  try { return successResponse(res, req.requestId, await createTicket(req.user.id, parsed.data), 201); } catch (e) { return fail(res, req.requestId, e); }
}

export async function listTicketsController(req: Request, res: Response) {
  try { return successResponse(res, req.requestId, await listTickets(req.user.id)); } catch (e) { return fail(res, req.requestId, e); }
}

export async function getTicketController(req: Request, res: Response) {
  const parsed = ticketIdSchema.safeParse(req.params);
  if (!parsed.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid ticket id", parsed.error.flatten());
  try { return successResponse(res, req.requestId, await getTicket(req.user.id, parsed.data.id)); } catch (e) { return fail(res, req.requestId, e); }
}

export async function addMessageController(req: Request, res: Response) {
  const params = ticketIdSchema.safeParse(req.params);
  const body = addSupportMessageSchema.safeParse(req.body);
  if (!params.success || !body.success) return errorResponse(res, req.requestId, 400, "VALIDATION_ERROR", "Invalid support message");
  try { return successResponse(res, req.requestId, await addMessage(req.user.id, params.data.id, body.data), 201); } catch (e) { return fail(res, req.requestId, e); }
}
