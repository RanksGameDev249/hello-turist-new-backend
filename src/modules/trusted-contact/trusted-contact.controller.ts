import type { Request, Response } from "express";
import { createTrustedContactSchema, idSchema, updateTrustedContactSchema } from "./trusted-contact.schema";
import { acceptTrustedContact, createTrustedContact, deleteTrustedContact, listTrustedContacts, revokeTrustedContact, updateTrustedContact } from "./trusted-contact.service";
import { errorResponse, successResponse } from "../../core/api-response";

function fail(res: Response, req: Request, error: unknown, status = 400) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const map: Record<string, [number,string]> = { TRUSTED_CONTACT_NOT_FOUND:[404,"Trusted contact not found"], TRUSTED_CONTACT_EXISTS:[409,"Trusted contact already exists"], SELF_TRUSTED_CONTACT:[400,"You cannot add yourself"], TRUSTED_CONTACT_INVITE_NOT_FOUND:[404,"Trusted contact invitation not found"] };
  const [s,m] = map[code] ?? [status,"Request failed"];
  return errorResponse(res, req.requestId, s, code, m);
}
function id(req: Request) { const p = idSchema.safeParse(req.params); return p.success ? p.data.id : null; }
export async function list(req: Request,res: Response){ try{return successResponse(res,req.requestId,await listTrustedContacts(req.user!.id));}catch(e){return fail(res,req,e,500)} }
export async function create(req: Request,res: Response){const p=createTrustedContactSchema.safeParse(req.body);if(!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid trusted contact",p.error.flatten());try{return successResponse(res,req.requestId,await createTrustedContact(req.user!.id,p.data),201)}catch(e){return fail(res,req,e)}}
export async function update(req: Request,res: Response){const contactId=id(req);const p=updateTrustedContactSchema.safeParse(req.body);if(!contactId||!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid trusted contact request",p.success?undefined:p.error.flatten());try{return successResponse(res,req.requestId,await updateTrustedContact(req.user!.id,contactId,p.data))}catch(e){return fail(res,req,e)}}
export async function remove(req: Request,res: Response){const contactId=id(req);if(!contactId)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid trusted contact id");try{return successResponse(res,req.requestId,await deleteTrustedContact(req.user!.id,contactId))}catch(e){return fail(res,req,e)}}
export async function accept(req: Request,res: Response){const contactId=id(req);if(!contactId)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid trusted contact id");try{return successResponse(res,req.requestId,await acceptTrustedContact(req.user!.id,contactId))}catch(e){return fail(res,req,e)}}
export async function revoke(req: Request,res: Response){const contactId=id(req);if(!contactId)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid trusted contact id");try{return successResponse(res,req.requestId,await revokeTrustedContact(req.user!.id,contactId))}catch(e){return fail(res,req,e)}}
