import { prisma } from "../../core/prisma";
import { writeAuditLog } from "./audit.service";

export async function listAdminSupportTickets(input:{page:number;limit:number;status?:string;search?:string}) {
 const where:any={};
 if(input.status) where.status=input.status;
 if(input.search?.trim()) where.OR=[
  {subject:{contains:input.search.trim(),mode:"insensitive"}},
  {user:{name:{contains:input.search.trim(),mode:"insensitive"}}},
  {user:{username:{contains:input.search.trim(),mode:"insensitive"}}}
 ];
 const [items,total]=await Promise.all([
  prisma.supportTicket.findMany({where,include:{user:{select:{id:true,name:true,username:true,email:true}},messages:{orderBy:{createdAt:"asc"}}},orderBy:{updatedAt:"desc"},skip:(input.page-1)*input.limit,take:input.limit}),
  prisma.supportTicket.count({where})
 ]);
 return {items,pagination:{page:input.page,limit:input.limit,total,totalPages:Math.ceil(total/input.limit)}};
}
export async function replyAdminSupportTicket(actorUserId:string,id:string,message:string){
 const ticket=await prisma.supportTicket.findUnique({where:{id},select:{id:true,status:true}});
 if(!ticket) throw new Error("TICKET_NOT_FOUND");
 if(ticket.status==="CLOSED") throw new Error("TICKET_CLOSED");
 const result=await prisma.$transaction(async tx=>{
  const msg=await tx.supportTicketMessage.create({data:{ticketId:id,userId:actorUserId,message,isStaff:true}});
  await tx.supportTicket.update({where:{id},data:{status:"IN_PROGRESS"}});
  return msg;
 });
 await writeAuditLog({actorUserId,action:"SUPPORT_TICKET_REPLIED",entityType:"SUPPORT_TICKET",entityId:id,metadata:{messageId:result.id}});
 return result;
}
export async function updateAdminSupportTicket(actorUserId:string,id:string,status:"OPEN"|"IN_PROGRESS"|"CLOSED"){
 const ticket=await prisma.supportTicket.findUnique({where:{id}});
 if(!ticket) throw new Error("TICKET_NOT_FOUND");
 const updated=await prisma.supportTicket.update({where:{id},data:{status}});
 await writeAuditLog({actorUserId,action:"SUPPORT_TICKET_STATUS_UPDATED",entityType:"SUPPORT_TICKET",entityId:id,metadata:{from:ticket.status,to:status}});
 return updated;
}