import { Request, Response } from "express";
import { getPublishedScreen, publishScreen, saveScreenDraft } from "./remote-ui.service";

const ok=(res:Response,data:any)=>res.json({success:true,data,error:null});
const fail=(res:Response,e:any)=>res.status(400).json({success:false,data:null,error:{code:e instanceof Error?e.message:"REMOTE_UI_ERROR"}});
const param=(req:Request,name:string)=>{const value=req.params[name];if(typeof value!=="string")throw new Error("INVALID_ROUTE_PARAM");return value;};
export async function getRemoteScreen(req:Request,res:Response){try{return ok(res,await getPublishedScreen(param(req,"screen"),typeof req.query.role==="string"?req.query.role:undefined));}catch(e){return fail(res,e)}}
export async function saveRemoteScreenDraft(req:Request,res:Response){try{return ok(res,await saveScreenDraft(param(req,"screen"),String(req.body.role),req.body.schema,req.user!.id));}catch(e){return fail(res,e)}}
export async function publishRemoteScreen(req:Request,res:Response){try{return ok(res,await publishScreen(param(req,"screen"),String(req.body.role),req.user!.id));}catch(e){return fail(res,e)}}
