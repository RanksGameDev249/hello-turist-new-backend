import { prisma } from "../../core/prisma";
import { NotificationType } from "../../generated/prisma/client";

async function sendVerificationDecisionNotification(userId:string,title:string,body:string,data:Record<string,string>){try{await prisma.notification.create({data:{userId,type:NotificationType.VERIFICATION_UPDATE,title,body,data}})}catch{}}

export async function updateRoleVerification(userId:string,role:"DRIVER"|"GUIDE",verificationStatus:"APPROVED"|"REJECTED"|"SUSPENDED"|"BLOCKED"){
 const user=await prisma.user.findUnique({where:{id:userId},select:{id:true,username:true,roles:{where:{role},select:{role:true,verificationStatus:true}}}});
 if(!user)throw new Error("USER_NOT_FOUND"); if(user.roles.length===0)throw new Error("ROLE_NOT_FOUND");
 const updatedRole=await prisma.userRoleAssignment.update({where:{userId_role:{userId,role}},data:{verificationStatus},select:{role:true,verificationStatus:true,createdAt:true}});
 await sendVerificationDecisionNotification(userId,`Provider ${verificationStatus.toLowerCase()}`,`Your ${role.toLowerCase()} account verification status is now ${verificationStatus.toLowerCase()}.`,{event:"ROLE_VERIFICATION_UPDATED",role,verificationStatus});
 return {user:{id:user.id,username:user.username},role:updatedRole};
}

export async function decideVerificationRequest(requestId:string,status:"VERIFIED"|"REJECTED",rejectionReason?:string){
 const request=await prisma.verificationRequest.findUnique({where:{id:requestId},select:{id:true,userId:true,role:true,status:true}});
 if(!request)throw new Error("VERIFICATION_REQUEST_NOT_FOUND"); if(request.role!=="DRIVER"&&request.role!=="GUIDE")throw new Error("INVALID_ROLE"); if(!["PENDING","UNDER_VERIFICATION","RESUBMITTED"].includes(request.status))throw new Error("INVALID_VERIFICATION_STATE");
 const updatedRequest=await prisma.$transaction(async tx=>{
  const updated=await tx.verificationRequest.update({where:{id:request.id},data:{status,rejectionReason:status==="REJECTED"?rejectionReason:null,reviewedAt:new Date()},include:{steps:{orderBy:{createdAt:"asc"}},documents:{select:{id:true,documentType:true,checksum:true,expiryDate:true,verificationStatus:true,createdAt:true,updatedAt:true},orderBy:{createdAt:"asc"}},liveSession:true}});
  await tx.verificationStep.updateMany({where:{verificationRequestId:request.id},data:{status:status==="VERIFIED"?"COMPLETED":"FAILED",completedAt:new Date()}});
  await tx.verificationDocument.updateMany({where:{verificationRequestId:request.id},data:{verificationStatus:status}});
  await tx.userRoleAssignment.update({where:{userId_role:{userId:request.userId,role:request.role}},data:{verificationStatus:status==="VERIFIED"?"APPROVED":"REJECTED"}});
  return updated;
 });
 await sendVerificationDecisionNotification(request.userId,status==="VERIFIED"?"Verification approved":"Verification rejected",status==="VERIFIED"?`Your ${request.role.toLowerCase()} verification has been approved.`:`Your ${request.role.toLowerCase()} verification was rejected: ${rejectionReason??"No reason provided"}.`,{event:status==="VERIFIED"?"VERIFICATION_APPROVED":"VERIFICATION_REJECTED",verificationRequestId:requestId,role:request.role});
 return updatedRequest;
}
