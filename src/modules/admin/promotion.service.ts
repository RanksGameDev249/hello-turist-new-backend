import { prisma } from "../../core/prisma";
import { writeAuditLog } from "./audit.service";
export async function listAdminPromotions(input: { page:number; limit:number; search?:string; active?:boolean }) {
 const where:string[]=[]; const values:unknown[]=[];
 if(input.search?.trim()){values.push("%"+input.search.trim()+"%");const n=values.length;where.push("(code ILIKE $"+n+" OR title ILIKE $"+n+")");}
 if(input.active!==undefined){values.push(input.active);where.push("is_active = $"+values.length);}
 const clause=where.length?"WHERE "+where.join(" AND "):""; const offset=(input.page-1)*input.limit;
 const c=await prisma.$queryRawUnsafe<Array<{count:bigint}>>("SELECT COUNT(*)::bigint AS count FROM promotions "+clause,...values);
 const rows=await prisma.$queryRawUnsafe<any[]>("SELECT * FROM promotions "+clause+" ORDER BY created_at DESC OFFSET $"+(values.length+1)+" LIMIT $"+(values.length+2),...values,offset,input.limit);
 const total=Number(c[0]?.count??0n); return {items:rows,pagination:{page:input.page,limit:input.limit,total,totalPages:Math.ceil(total/input.limit)}};
}
export async function createAdminPromotion(actorUserId:string,input:any){
 const rows=await prisma.$queryRawUnsafe<any[]>("INSERT INTO promotions (code,title,description,discount_type,discount_value,max_discount,min_ride_amount,usage_limit,starts_at,expires_at,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",input.code.toUpperCase(),input.title,input.description??null,input.discountType,input.discountValue,input.maxDiscount??null,input.minRideAmount??null,input.usageLimit??null,input.startsAt,input.expiresAt,input.isActive);
 const created=rows[0]; await writeAuditLog({actorUserId,action:"PROMOTION_CREATED",entityType:"PROMOTION",entityId:created.id,metadata:{code:created.code}}); return created;
}
export async function updateAdminPromotion(actorUserId:string,id:string,input:Record<string,unknown>){
 const map:Record<string,string>={title:"title",description:"description",discountType:"discount_type",discountValue:"discount_value",maxDiscount:"max_discount",minRideAmount:"min_ride_amount",usageLimit:"usage_limit",startsAt:"starts_at",expiresAt:"expires_at",isActive:"is_active"};
 const entries=Object.entries(input).filter(([k,v])=>map[k]&&v!==undefined); if(!entries.length)throw new Error("NO_UPDATE_FIELDS");
 const values=entries.map(([,v])=>v); const sets=entries.map(([k],i)=>'"'+map[k]+'" = $'+(i+2)).join(", ");
 const rows=await prisma.$queryRawUnsafe<any[]>("UPDATE promotions SET "+sets+", updated_at=NOW() WHERE id=$1 RETURNING *",id,...values);
 if(!rows[0])throw new Error("PROMOTION_NOT_FOUND"); await writeAuditLog({actorUserId,action:"PROMOTION_UPDATED",entityType:"PROMOTION",entityId:id,metadata:input}); return rows[0];
}
export async function deactivateAdminPromotion(actorUserId:string,id:string){
 const rows=await prisma.$queryRawUnsafe<any[]>("UPDATE promotions SET is_active=false,updated_at=NOW() WHERE id=$1 RETURNING *",id);
 if(!rows[0])throw new Error("PROMOTION_NOT_FOUND"); await writeAuditLog({actorUserId,action:"PROMOTION_DEACTIVATED",entityType:"PROMOTION",entityId:id}); return rows[0];
}