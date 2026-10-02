import type { Request, Response } from "express";
import { prisma } from "../../core/prisma";
import { writeAuditLog } from "./audit.service";

const TYPES = {
  homestays: "homestay",
  sponsors: "sponsor",
  "business-partners": "businessPartner",
} as const;

function param(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function modelFor(type: string) {
  const key = TYPES[type as keyof typeof TYPES];
  if (!key) throw new Error("INVALID_CONTENT_TYPE");
  return key;
}
function payload(body: any) {
  return {
    name: String(body.name ?? "").trim(),
    description: body.description ?? null,
    address: body.address ?? null,
    city: body.city ?? null,
    latitude: body.latitude === null || body.latitude === undefined || body.latitude === "" ? null : Number(body.latitude),
    longitude: body.longitude === null || body.longitude === undefined || body.longitude === "" ? null : Number(body.longitude),
    placeId: body.placeId ?? null,
    imageUrl: body.imageUrl ?? null,
    phone: body.phone ?? null,
    email: body.email ?? null,
    website: body.website ?? null,
    isActive: body.isActive !== false,
  };
}
export async function listContentController(req: Request, res: Response) {
  try {
    const type = param(req.params.type); if (!type) throw new Error("INVALID_CONTENT_TYPE"); const model = modelFor(type);
    const rows = await (prisma as any)[model].findMany({ orderBy: { createdAt: "desc" }, take: Math.min(Math.max(Number(req.query.limit) || 100, 1), 200) });
    return res.json({ success: true, data: rows });
  } catch (e) { return res.status(400).json({ success: false, error: (e as Error).message }); }
}
export async function createContentController(req: Request, res: Response) {
  try {
    const model = modelFor(req.params.type); const data = payload(req.body);
    if (!data.name || (type === "homestays" && (!data.address || data.latitude === null || data.longitude === null))) return res.status(400).json({ success:false,error:"NAME_ADDRESS_AND_LOCATION_REQUIRED" });
    const row = await (prisma as any)[model].create({ data });
    await writeAuditLog({ actorUserId: req.user!.id, action: "ADMIN_CONTENT_CREATED", entityType: type.toUpperCase(), entityId: row.id, metadata: { name: row.name }, requestId: req.requestId });
    return res.status(201).json({ success:true,data:row });
  } catch (e) { return res.status(400).json({ success:false,error:(e as Error).message }); }
}
export async function updateContentController(req: Request, res: Response) {
  try {
    const model = modelFor(req.params.type); const data = payload(req.body); delete (data as any).name;
    const row = await (prisma as any)[model].update({ where:{id:req.params.id}, data });
    await writeAuditLog({ actorUserId:req.user!.id, action:"ADMIN_CONTENT_UPDATED", entityType:type.toUpperCase(), entityId:row.id, metadata:{name:row.name}, requestId:req.requestId });
    return res.json({success:true,data:row});
  } catch(e) { return res.status(400).json({success:false,error:(e as Error).message}); }
}
export async function deleteContentController(req: Request, res: Response) {
  try {
    const model = modelFor(req.params.type);
    const row = await (prisma as any)[model].update({where:{id:req.params.id},data:{isActive:false}});
    await writeAuditLog({actorUserId:req.user!.id,action:"ADMIN_CONTENT_DEACTIVATED",entityType:req.params.type.toUpperCase(),entityId:row.id,metadata:{},requestId:req.requestId});
    return res.json({success:true,data:{id:row.id,deleted:true}});
  } catch(e) { return res.status(400).json({success:false,error:(e as Error).message}); }
}
