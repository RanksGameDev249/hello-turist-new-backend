import type { Request, Response } from "express";
import { getPerson, listPeople, type PeopleRole } from "./people.service";

const ROLES = new Set(["RIDER", "DRIVER", "GUIDE"]);

export async function getPeople(req: Request, res: Response) {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const role = typeof req.query.role === "string" && ROLES.has(req.query.role) ? req.query.role as PeopleRole : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const result = await listPeople({ page, limit, role, status, search });
  return res.json({ success: true, data: { items: result.items, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: Math.ceil(result.total / result.limit) } } });
}

export async function getPersonById(req: Request, res: Response) {
  const id = typeof req.params.id === "string" ? req.params.id : undefined;
  if (!id) return res.status(400).json({ success: false, message: "Invalid person id" });
  const person = await getPerson(id);
  if (!person) return res.status(404).json({ success: false, message: "Person not found" });
  return res.json({ success: true, data: person });
}


import bcrypt from "bcrypt";
import { prisma } from "../../core/prisma";
import { writeAuditLog } from "./audit.service";

function param(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
type ProviderRole = "RIDER" | "DRIVER" | "GUIDE";

export async function createPersonController(req: Request, res: Response) {
  try {
    const { name, username, email, phone, password, role = "RIDER", status = "ACTIVE", preferredLanguage = "en", bio, experienceYears, serviceCity, serviceArea, languages, specialties, isAvailable } = req.body ?? {};
    if (typeof name !== "string" || !name.trim() || typeof username !== "string" || !username.trim() || typeof password !== "string" || password.length < 8 || !["RIDER","DRIVER","GUIDE"].includes(role) || !["ACTIVE","BLOCKED","SUSPENDED"].includes(status)) return res.status(400).json({ success:false,error:"INVALID_PERSON" });
    const passwordHash=await bcrypt.hash(password,12);
    const created=await prisma.$transaction(async tx=>{
      const user=await tx.user.create({data:{name:name.trim(),username:username.trim(),email:typeof email==="string"&&email.trim()?email.trim():null,phone:typeof phone==="string"&&phone.trim()?phone.trim():null,passwordHash,status,preferredLanguage}});
      await tx.userRoleAssignment.create({data:{userId:user.id,role:role as ProviderRole,verificationStatus:role==="RIDER"?"VERIFIED":"PENDING"}});
      if(role==="DRIVER") await tx.driverProfile.create({data:{userId:user.id,bio:bio??null,experienceYears:Number.isInteger(experienceYears)?experienceYears:null,serviceCity:serviceCity??null,serviceArea:serviceArea??null,isAvailable:Boolean(isAvailable)}});
      if(role==="GUIDE") await tx.guideProfile.create({data:{userId:user.id,bio:bio??null,experienceYears:Number.isInteger(experienceYears)?experienceYears:null,serviceCity:serviceCity??null,languages:Array.isArray(languages)?languages:[],specialties:Array.isArray(specialties)?specialties:[],isAvailable:Boolean(isAvailable)}});
      return user;
    });
    await writeAuditLog({actorUserId:req.user!.id,action:"ADMIN_PERSON_CREATED",entityType:"USER",entityId:created.id,metadata:{role},requestId:req.requestId});
    return res.status(201).json({success:true,data:{id:created.id,name:created.name,username:created.username,email:created.email,role}});
  } catch(error) {
    if((error as any)?.code==="P2002") return res.status(409).json({success:false,error:"USERNAME_EMAIL_OR_PHONE_EXISTS"});
    console.error("ADMIN_PERSON_CREATE_ERROR:",error); return res.status(500).json({success:false,error:"INTERNAL_SERVER_ERROR"});
  }
}

export async function updatePersonController(req: Request, res: Response) {
  try {
    const id=param(req.params.id); if(!id) return res.status(400).json({success:false,error:"INVALID_PERSON_ID"});
    const body=req.body??{};
    const existing=await prisma.user.findUnique({where:{id},select:{id:true}});
    if(!existing) return res.status(404).json({success:false,error:"PERSON_NOT_FOUND"});
    const currentRole=await prisma.userRoleAssignment.findFirst({where:{userId:id},select:{role:true}});
    const role:ProviderRole=typeof body.role==="string"&&["RIDER","DRIVER","GUIDE"].includes(body.role)?body.role:(currentRole?.role&&["RIDER","DRIVER","GUIDE"].includes(currentRole.role)?currentRole.role:"RIDER") as ProviderRole;
    const updated=await prisma.$transaction(async tx=>{
      const user=await tx.user.update({where:{id},data:{...(typeof body.name==="string"?{name:body.name.trim()}:{}),...(typeof body.username==="string"?{username:body.username.trim()}:{}),...(body.email!==undefined?{email:body.email||null}:{}),...(body.phone!==undefined?{phone:body.phone||null}:{}),...(typeof body.status==="string"&&["ACTIVE","BLOCKED","SUSPENDED"].includes(body.status)?{status:body.status}:{}),...(typeof body.preferredLanguage==="string"?{preferredLanguage:body.preferredLanguage}:{}),...(typeof body.password==="string"&&body.password.length>=8?{passwordHash:await bcrypt.hash(body.password,12)}:{})}});
      if(!currentRole || currentRole.role!==role) {
        await tx.userRoleAssignment.deleteMany({where:{userId:id}});
        await tx.userRoleAssignment.create({data:{userId:id,role,verificationStatus:role==="RIDER"?"VERIFIED":"PENDING"}});
      }
      if(role==="DRIVER") await tx.driverProfile.upsert({where:{userId:id},create:{userId:id},update:{...(body.bio!==undefined?{bio:body.bio}:{}),...(Number.isInteger(body.experienceYears)?{experienceYears:body.experienceYears}:{}),...(body.serviceCity!==undefined?{serviceCity:body.serviceCity}:{}),...(body.serviceArea!==undefined?{serviceArea:body.serviceArea}:{}),...(body.isAvailable!==undefined?{isAvailable:Boolean(body.isAvailable)}:{})}});
      if(role==="GUIDE") await tx.guideProfile.upsert({where:{userId:id},create:{userId:id},update:{...(body.bio!==undefined?{bio:body.bio}:{}),...(Number.isInteger(body.experienceYears)?{experienceYears:body.experienceYears}:{}),...(body.serviceCity!==undefined?{serviceCity:body.serviceCity}:{}),...(Array.isArray(body.languages)?{languages:body.languages}:{}),...(Array.isArray(body.specialties)?{specialties:body.specialties}:{}),...(body.isAvailable!==undefined?{isAvailable:Boolean(body.isAvailable)}:{})}});
      return user;
    });
    await writeAuditLog({actorUserId:req.user!.id,action:"ADMIN_PERSON_UPDATED",entityType:"USER",entityId:id,metadata:{role},requestId:req.requestId});
    return res.json({success:true,data:{id:updated.id,name:updated.name,username:updated.username,email:updated.email,phone:updated.phone,status:updated.status,role}});
  } catch(error) {
    if((error as any)?.code==="P2002") return res.status(409).json({success:false,error:"USERNAME_EMAIL_OR_PHONE_EXISTS"});
    console.error("ADMIN_PERSON_UPDATE_ERROR:",error); return res.status(500).json({success:false,error:"INTERNAL_SERVER_ERROR"});
  }
}

export async function deletePersonController(req: Request, res: Response) {
  const id=param(req.params.id); if(!id) return res.status(400).json({success:false,error:"INVALID_PERSON_ID"});
  if(id===req.user?.id) return res.status(409).json({success:false,error:"SELF_DELETE_NOT_ALLOWED"});
  const existing=await prisma.user.findUnique({where:{id},select:{id:true}});
  if(!existing) return res.status(404).json({success:false,error:"PERSON_NOT_FOUND"});
  await prisma.user.update({where:{id},data:{status:"DELETED",deletedAt:new Date()}});
  await writeAuditLog({actorUserId:req.user!.id,action:"ADMIN_PERSON_DELETED",entityType:"USER",entityId:id,metadata:{softDelete:true},requestId:req.requestId});
  return res.json({success:true,data:{id,deleted:true}});
}
