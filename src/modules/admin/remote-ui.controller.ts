import { Request, Response } from "express";
import { getPublishedScreen, publishScreen, saveScreenDraft } from "./remote-ui.service";

const ok=(res:Response,data:any)=>res.json({success:true,data,error:null});
const fail=(res:Response,e:any)=>res.status(400).json({success:false,data:null,error:{code:e instanceof Error?e.message:"REMOTE_UI_ERROR"}});
export async function getRemoteScreen(req:Request,res:Response){try{return ok(res,await getPublishedScreen(req.params.screen,req.query.role as string|undefined));}catch(e){return fail(res,e)}}
export async function saveRemoteScreenDraft(req:Request,res:Response){try{return ok(res,await saveScreenDraft(req.params.screen,String(req.body.role),req.body.schema,req.user!.id));}catch(e){return fail(res,e)}}
export async function publishRemoteScreen(req:Request,res:Response){try{return ok(res,await publishScreen(req.params.screen,String(req.body.role),req.user!.id));}catch(e){return fail(res,e)}}
