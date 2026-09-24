import crypto from "node:crypto";
import { prisma } from "../../core/prisma";
import { writeAuditLog } from "./audit.service";

type ListInput = { page:number; limit:number; status?:string; provider?:string; search?:string; from?:Date; to?:Date };

function config(){const keyId=process.env.RAZORPAY_KEY_ID;const keySecret=process.env.RAZORPAY_KEY_SECRET;if(!keyId||!keySecret)throw new Error("RAZORPAY_NOT_CONFIGURED");return {keyId,keySecret};}
async function razorpayRefund(providerPaymentId:string, amount:number, receipt:string, notes:Record<string,string>){
 const {keyId,keySecret}=config();
 const response=await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(providerPaymentId)}/refund`,{method:"POST",headers:{"content-type":"application/json",authorization:`Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`},body:JSON.stringify({amount:Math.round(amount*100),receipt:receipt.slice(0,40),notes})});
 if(!response.ok)throw new Error("RAZORPAY_REFUND_FAILED");
 return response.json() as Promise<any>;
}

export async function listAdminPayments(input:ListInput){
 const where:any={...(input.status?{status:input.status}:{}),...(input.provider?{provider:input.provider}:{}),...(input.search?{OR:[{id:{contains:input.search,mode:"insensitive"}},{providerPaymentId:{contains:input.search,mode:"insensitive"}},{payer:{name:{contains:input.search,mode:"insensitive"}}}]}:{}),createdAt:{...(input.from?{gte:input.from}:{}),...(input.to?{lte:input.to}: {})}};
 const [items,total]=await Promise.all([
  prisma.payment.findMany({where,skip:(input.page-1)*input.limit,take:input.limit,orderBy:{createdAt:"desc"},include:{payer:{select:{id:true,name:true,username:true,email:true}},ride:{select:{id:true,status:true,pickupAddress:true,dropoffAddress:true}},refunds:{orderBy:{createdAt:"desc"}}}}),
  prisma.payment.count({where})
 ]);
 return {items,pagination:{page:input.page,limit:input.limit,total,totalPages:Math.max(1,Math.ceil(total/input.limit))}};
}

export async function adminRefundPayment(paymentId:string, actorUserId:string, input:{amount?:number;reason:string}, requestId?:string){
 const result=await prisma.$transaction(async tx=>{
  const payment=await tx.payment.findUnique({where:{id:paymentId},include:{refunds:true}});
  if(!payment)throw new Error("PAYMENT_NOT_FOUND");
  if(payment.provider!=="RAZORPAY")throw new Error("REFUND_PROVIDER_UNSUPPORTED");
  if(payment.status!=="CAPTURED")throw new Error("PAYMENT_NOT_REFUNDABLE");
  if(!payment.providerPaymentId)throw new Error("PAYMENT_PROVIDER_ID_MISSING");
  if(payment.refunds.some(r=>r.status==="PENDING"||r.status==="PROCESSING"))throw new Error("REFUND_ALREADY_PROCESSING");
  const already=payment.refunds.reduce((s,r)=>r.status==="FAILED"?s:s+Number(r.amount),0);
  const amount=input.amount??Number(payment.amount)-already;
  if(!Number.isFinite(amount)||amount<=0||amount>Number(payment.amount)-already)throw new Error("INVALID_REFUND_AMOUNT");
  const refund=await tx.refund.create({data:{paymentId,amount,reason:input.reason}});
  return {payment,refund,amount};
 });
 try{
  const provider=await razorpayRefund(result.payment.providerPaymentId!,result.amount,`refund_${result.refund.id}`,{paymentId,refundId:result.refund.id,reason:input.reason});
  const providerStatus=String(provider?.status||"pending").toLowerCase();
  const status=providerStatus==="processed"?"COMPLETED":providerStatus==="failed"?"FAILED":"PENDING";
  const refund=await prisma.$transaction(async tx=>{
   const updated=await tx.refund.update({where:{id:result.refund.id},data:{status,providerRefundId:provider?.id??undefined}});
   if(status==="COMPLETED"){
    const refunds=await tx.refund.findMany({where:{paymentId,status:{not:"FAILED"}}});
    if(refunds.reduce((s,r)=>s+Number(r.amount),0)>=Number(result.payment.amount))await tx.payment.update({where:{id:paymentId},data:{status:"REFUNDED"}});
   }
   return updated;
  });
  await writeAuditLog({actorUserId,action:"PAYMENT_REFUND_CREATED",entityType:"PAYMENT",entityId:paymentId,metadata:{refundId:refund.id,amount:result.amount,reason:input.reason,providerRefundId:refund.providerRefundId??null},requestId});
  return refund;
 }catch(e){
  await prisma.refund.update({where:{id:result.refund.id},data:{status:"FAILED"}});
  throw e instanceof Error && ["RAZORPAY_NOT_CONFIGURED","RAZORPAY_REFUND_FAILED"].includes(e.message)?e:new Error("RAZORPAY_REFUND_FAILED");
 }
}
