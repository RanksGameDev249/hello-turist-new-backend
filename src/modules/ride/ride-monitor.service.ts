import { prisma } from "../../core/prisma";

const HEARTBEAT_TIMEOUT_MS = Number(process.env.RIDE_HEARTBEAT_TIMEOUT_MS ?? 90_000);
const DEVIATION_KM = Number(process.env.RIDE_ROUTE_DEVIATION_KM ?? 2);

function distanceKm(aLat:number,aLng:number,bLat:number,bLng:number){const r=6371,dLat=(bLat-aLat)*Math.PI/180,dLng=(bLng-aLng)*Math.PI/180;const x=Math.sin(dLat/2)**2+Math.cos(aLat*Math.PI/180)*Math.cos(bLat*Math.PI/180)*Math.sin(dLng/2)**2;return 2*r*Math.asin(Math.sqrt(x));}

export async function getDriverHeartbeat(rideId:string,driverId:string){
  const last=await prisma.rideLocation.findFirst({where:{rideId,driverId},orderBy:{recordedAt:"desc"},select:{recordedAt:true,latitude:true,longitude:true}});
  if(!last)return {alive:false,lastSeenAt:null};
  return {alive:Date.now()-last.recordedAt.getTime()<=HEARTBEAT_TIMEOUT_MS,lastSeenAt:last.recordedAt,latitude:last.latitude,longitude:last.longitude};
}

export async function detectRouteDeviation(rideId:string){
  const ride=await prisma.ride.findUnique({where:{id:rideId},select:{id:true,pickupLatitude:true,pickupLongitude:true,dropoffLatitude:true,dropoffLongitude:true,status:true}});
  if(!ride||ride.status!=="IN_PROGRESS")return null;
  const last=await prisma.rideLocation.findFirst({where:{rideId},orderBy:{recordedAt:"desc"},select:{latitude:true,longitude:true,recordedAt:true,driverId:true}});
  if(!last)return null;
  const toPickup=distanceKm(last.latitude,last.longitude,ride.pickupLatitude,ride.pickupLongitude);
  const toDropoff=distanceKm(last.latitude,last.longitude,ride.dropoffLatitude,ride.dropoffLongitude);
  const deviation=Math.min(toPickup,toDropoff);
  if(deviation<DEVIATION_KM)return null;
  const duplicate=await prisma.rideEvent.findFirst({where:{rideId,type:"ROUTE_DEVIATION",createdAt:{gte:new Date(Date.now()-5*60*1000)}}});
  if(duplicate)return duplicate;
  return prisma.rideEvent.create({data:{rideId,actorUserId:last.driverId,type:"ROUTE_DEVIATION",payload:{distanceFromKnownEndpointKm:deviation,recordedAt:last.recordedAt.toISOString()}}});
}

export async function monitorActiveRides(){
  const rides=await prisma.ride.findMany({where:{status:"IN_PROGRESS"},select:{id:true,assignments:{where:{status:"ACCEPTED"},select:{driverId:true},take:1}} ,take:100});
  const stale:string[]=[];
  for(const ride of rides){const d=ride.assignments[0];if(!d)continue;const hb=await getDriverHeartbeat(ride.id,d.driverId);if(!hb.alive)stale.push(ride.id);await detectRouteDeviation(ride.id);}
  return stale;
}

export function startRideMonitor(){if(process.env.RIDE_MONITOR_ENABLED!=="true")return;const interval=Math.max(5000,Number(process.env.RIDE_MONITOR_INTERVAL_MS??30000));void monitorActiveRides();setInterval(()=>void monitorActiveRides(),interval);}
