import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { createPromotionSchema, promotionCodeSchema, promotionIdSchema, updatePromotionSchema } from "./promotion.schema";
import { createPromotion, deletePromotion, getPromotionByCode, getPromotionById, listActivePromotions, updatePromotion } from "./promotion.service";

const fail = (res: Response, req: Request, e: unknown) => {
  const code = e instanceof Error ? e.message : "INTERNAL_ERROR";
  const status = code === "PROMOTION_NOT_FOUND" ? 404 : code.includes("unique") ? 409 : 500;
  return errorResponse(res, req.requestId, status, code, code === "PROMOTION_NOT_FOUND" ? "Promotion not found" : "Promotion operation failed");
};

export async function listActivePromotionsController(req: Request,res: Response){ try{return successResponse(res,req.requestId,await listActivePromotions())}catch(e){return fail(res,req,e)} }
export async function getPromotionByCodeController(req: Request,res: Response){const p=promotionCodeSchema.safeParse(req.params);if(!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid promotion code");try{return successResponse(res,req.requestId,await getPromotionByCode(p.data.code))}catch(e){return fail(res,req,e)} }
export async function createPromotionController(req: Request,res: Response){const p=createPromotionSchema.safeParse(req.body);if(!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid promotion",p.error.flatten());try{return successResponse(res,req.requestId,await createPromotion(p.data),201)}catch(e){return fail(res,req,e)} }
export async function getPromotionController(req: Request,res: Response){const p=promotionIdSchema.safeParse(req.params);if(!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid promotion id");try{return successResponse(res,req.requestId,await getPromotionById(p.data.id))}catch(e){return fail(res,req,e)} }
export async function updatePromotionController(req: Request,res: Response){const id=promotionIdSchema.safeParse(req.params),p=updatePromotionSchema.safeParse(req.body);if(!id.success||!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid promotion update");try{return successResponse(res,req.requestId,await updatePromotion(id.data.id,p.data))}catch(e){return fail(res,req,e)} }
export async function deletePromotionController(req: Request,res: Response){const p=promotionIdSchema.safeParse(req.params);if(!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid promotion id");try{return successResponse(res,req.requestId,await deletePromotion(p.data.id))}catch(e){return fail(res,req,e)} }
