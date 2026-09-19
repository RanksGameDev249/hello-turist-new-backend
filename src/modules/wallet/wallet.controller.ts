import type { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { adRewardSchema, createRedeemCodeSchema, redeemSchema, walletConfigSchema } from "./wallet.schema";
import { createRedeemCode, getConfig, getWallet, listRedeemCodes, redeemCode, registerDevice, rewardAdView, updateConfig } from "./wallet.service";

function fail(res: Response, requestId: string, e: unknown) {
  const code = e instanceof Error ? e.message : "INTERNAL_ERROR";
  const map: Record<string, [number,string]> = {
    AD_ALREADY_REWARDED:[409,"This ad impression has already been rewarded"], REDEEM_DISABLED:[403,"Wallet redemption is currently disabled"], INVALID_REDEEM_CODE:[404,"Invalid redeem code"], CODE_ALREADY_REDEEMED:[409,"Redeem code already used"], CODE_EXPIRED:[410,"Redeem code expired"], INSUFFICIENT_COINS:[409,"Insufficient coins"], REDEEM_THRESHOLD_NOT_MET:[409,"Redeem threshold not met"], MONTHLY_PASS_DISABLED:[403,"Monthly pass codes are disabled"], COIN_COST_REQUIRED:[400,"coinCost is required"], PASS_MONTHS_REQUIRED:[400,"passMonths is required"],
  };
  const [status,message]=map[code]??[500,"Internal server error"];
  return errorResponse(res,requestId,status,code,message);
}
export async function walletController(req: Request,res: Response){try{return successResponse(res,req.requestId,await getWallet(req.user!.id));}catch(e){return fail(res,req.requestId,e);}}
export async function rewardAdController(req: Request,res: Response){const p=adRewardSchema.safeParse(req.body);if(!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid ad reward request",p.error.flatten());try{return successResponse(res,req.requestId,await rewardAdView(req.user!.id,p.data),201);}catch(e){return fail(res,req.requestId,e);}}
export async function redeemController(req: Request,res: Response){const p=redeemSchema.safeParse(req.body);if(!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid redeem code",p.error.flatten());try{return successResponse(res,req.requestId,await redeemCode(req.user!.id,p.data.code));}catch(e){return fail(res,req.requestId,e);}}
export async function registerDeviceController(req: Request,res: Response){const token=typeof req.body?.token==="string"?req.body.token.trim():"";if(token.length<20||token.length>4096)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid FCM token");try{return successResponse(res,req.requestId,await registerDevice(req.user!.id,token),201);}catch(e){return fail(res,req.requestId,e);}}
export async function getWalletConfigController(req: Request,res: Response){try{return successResponse(res,req.requestId,await getConfig());}catch(e){return fail(res,req.requestId,e);}}
export async function updateWalletConfigController(req: Request,res: Response){const p=walletConfigSchema.safeParse(req.body);if(!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid wallet configuration",p.error.flatten());try{return successResponse(res,req.requestId,await updateConfig(req.user!.id,p.data));}catch(e){return fail(res,req.requestId,e);}}
export async function createRedeemCodeController(req: Request,res: Response){const p=createRedeemCodeSchema.safeParse(req.body);if(!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid redeem code configuration",p.error.flatten());try{return successResponse(res,req.requestId,await createRedeemCode(p.data),201);}catch(e){return fail(res,req.requestId,e);}}
export async function listRedeemCodesController(req: Request,res: Response){try{return successResponse(res,req.requestId,await listRedeemCodes());}catch(e){return fail(res,req.requestId,e);}}
