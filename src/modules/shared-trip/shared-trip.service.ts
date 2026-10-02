import { prisma } from "../../core/prisma";
function assertValidShare(shared: { expiresAt: Date; revokedAt: Date | null }) { if (shared.revokedAt || shared.expiresAt.getTime() <= Date.now()) throw new Error("SHARED_TRIP_EXPIRED"); }
export async function getPublicSharedTrip(shareId: string) {
 const shared=await prisma.sharedTrip.findUnique({where:{id:shareId}}); if(!shared) throw new Error("SHARED_TRIP_NOT_FOUND"); assertValidShare(shared);
 const ride=await prisma.ride.findUnique({where:{id:shared.rideId},include:{assignments:{where:{status:"ACCEPTED"},orderBy:{acceptedAt:"desc"},take:1},locations:{orderBy:{recordedAt:"desc"},take:1}}}); if(!ride) throw new Error("RIDE_NOT_FOUND");
 const rider=await prisma.user.findUnique({where:{id:ride.riderId},select:{name:true}});
 const assignment=ride.assignments[0]?await prisma.rideAssignment.findUnique({where:{id:ride.assignments[0].id},include:{driver:{select:{id:true,name:true,phone:true,driverProfile:{include:{vehicles:{where:{isActive:true},take:1}}}}}}}):null;
 const driver=assignment?.driver; const vehicle=driver?.driverProfile?.vehicles?.[0]; const loc=ride.locations[0];
 return {shareId:shared.id,expiresAt:shared.expiresAt,ride:{id:ride.id,status:ride.status,pickupAddress:ride.pickupAddress,dropoffAddress:ride.dropoffAddress,riderName:rider?.name??"Rider",driver:driver?{id:driver.id,name:driver.name,phone:driver.phone,vehicle:vehicle?{make:vehicle.make,model:vehicle.model,color:vehicle.color,registrationNumber:vehicle.registrationNumber,vehicleType:vehicle.vehicleType}:null}:null,liveLocation:loc?{latitude:Number(loc.latitude),longitude:Number(loc.longitude),accuracy:loc.accuracy?Number(loc.accuracy):null,recordedAt:loc.recordedAt}:null}};
}