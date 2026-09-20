import { prisma } from "../../core/prisma";
import { notifyUser } from "../notification/notification.service";

const OFFER_TIMEOUT_MS = Number(process.env.RIDE_DRIVER_OFFER_TIMEOUT_MS ?? 30_000);
const MAX_CANDIDATES = Number(process.env.RIDE_DISPATCH_MAX_CANDIDATES ?? 10);
const RETRY_MS = Number(process.env.RIDE_DISPATCH_RETRY_MS ?? 5_000);

function distanceKm(aLat:number,aLng:number,bLat:number,bLng:number){
  const r=6371, dLat=(bLat-aLat)*Math.PI/180, dLng=(bLng-aLng)*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.cos(aLat*Math.PI/180)*Math.cos(bLat*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2*r*Math.asin(Math.sqrt(x));
}

export async function dispatchRide(rideId:string, actorUserId?:string){
  return prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${rideId}))`;
    const ride=await tx.ride.findUnique({where:{id:rideId},select:{id:true,riderId:true,status:true,pickupLatitude:true,pickupLongitude:true}});
    if(!ride || !["REQUESTED","SEARCHING"].includes(String(ride.status))) return null;
    const active=await tx.rideAssignment.findFirst({where:{rideId,status:{in:["OFFERED","ACCEPTED"]}},select:{id:true,driverId:true}});
    if(active) return active;
    const drivers=await tx.driverProfile.findMany({where:{isAvailable:true,user:{status:"ACTIVE",roles:{some:{role:"DRIVER",verificationStatus:"APPROVED"}}}},select:{userId:true,latitude:true,longitude:true,updatedAt:true},take:MAX_CANDIDATES});
    const ranked=drivers.filter(d=>d.latitude!=null&&d.longitude!=null).sort((a,b)=>distanceKm(ride.pickupLatitude,ride.pickupLongitude,a.latitude!,a.longitude!)-distanceKm(ride.pickupLatitude,ride.pickupLongitude,b.latitude!,b.longitude!));
    const candidate=ranked[0];
    if(!candidate) return null;
    const assignment=await tx.rideAssignment.create({data:{rideId,driverId:candidate.userId,status:"OFFERED"}});
    await tx.ride.update({where:{id:rideId},data:{status:"ASSIGNED"}});
    await tx.rideEvent.create({data:{rideId,actorUserId:actorUserId??ride.riderId,type:"DRIVER_ASSIGNED",payload:{driverId:candidate.userId,assignmentId:assignment.id,dispatch:"automatic"}}});
    return {assignment,riderId:ride.riderId,driverId:candidate.userId};
  }).then(result=>{
    if(result){void notifyUser(result.driverId,"New ride request","You have a new ride request. Please respond before it expires.",{rideId,assignmentId:result.assignment.id,status:"OFFERED"}).catch(()=>undefined);}
    return result;
  });
}

export async function expireOfferedAssignments(){
  const cutoff=new Date(Date.now()-OFFER_TIMEOUT_MS);
  const expired=await prisma.$transaction(async tx=>{
    const rows=await tx.rideAssignment.findMany({where:{status:"OFFERED",createdAt:{lte:cutoff}},select:{id:true,rideId:true,driverId:true}});
    for(const a of rows){
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${a.rideId}))`;
      const current=await tx.rideAssignment.findUnique({where:{id:a.id},select:{status:true}});
      if(!current||current.status!=="OFFERED")continue;
      await tx.rideAssignment.update({where:{id:a.id},data:{status:"EXPIRED",rejectedAt:new Date()}});
      await tx.rideEvent.create({data:{rideId:a.rideId,actorUserId:a.driverId,type:"DRIVER_REJECTED",payload:{assignmentId:a.id,reason:"OFFER_TIMEOUT"}}});
      const remaining=await tx.rideAssignment.count({where:{rideId:a.rideId,status:{in:["OFFERED","ACCEPTED"]}}});
      if(remaining===0)await tx.ride.updateMany({where:{id:a.rideId,status:"ASSIGNED"},data:{status:"SEARCHING"}});
    }
    return rows.length;
  });
  return expired;
}

export async function runDispatchSweep(){
  await expireOfferedAssignments();
  const rides=await prisma.ride.findMany({where:{status:{in:["REQUESTED","SEARCHING"]}},select:{id:true},take:100});
  for(const r of rides){try{await dispatchRide(r.id);}catch{ /* next sweep retries */ }}
}

export function startDispatchWorker(){
  if(process.env.RIDE_DISPATCH_WORKER_ENABLED!=="true")return;
  const interval=Math.max(1000,RETRY_MS);
  void runDispatchSweep();
  setInterval(()=>void runDispatchSweep(),interval);
}
