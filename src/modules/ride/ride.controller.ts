import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/api-response";
import { assignRideSchema, cancelRideSchema, createRideSchema, locationSchema, rideEventSchema, rideListQuerySchema } from "./ride.schema";
import * as service from "./ride.service";

function getRideId(req: Request): string { const { id } = req.params; if (typeof id !== "string") throw new Error("INVALID_RIDE_ID"); return id; }

function handleError(res: Response, requestId: string, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const map: Record<string, [number, string]> = {
    RIDE_NOT_FOUND:[404,"Ride not found"], RIDE_ACCESS_DENIED:[403,"You do not have access to this ride"], ADMIN_REQUIRED:[403,"Admin access required"],
    DRIVER_NOT_VERIFIED:[400,"Driver is not verified"], INVALID_RIDE_STATE:[409,"Invalid ride state transition"], DRIVER_ASSIGNMENT_NOT_FOUND:[404,"Driver assignment not found"],
    INVALID_ASSIGNMENT_STATE:[409,"Invalid assignment state"], DRIVER_ASSIGNMENT_NOT_ACCEPTED:[409,"Driver assignment is not accepted"], DRIVER_REQUIRED:[403,"Driver access required"],
    RIDE_ALREADY_ASSIGNED:[409,"Ride already has an active driver assignment"], RIDE_ALREADY_ACCEPTED:[409,"Ride already has an accepted driver"],
    LOCATION_TIMESTAMP_INVALID:[400,"Location timestamp cannot be more than one minute in the future"], LOCATION_TIMESTAMP_TOO_OLD:[400,"Location timestamp is too old"], INVALID_RIDE_ID:[400,"Invalid ride id"],
  };
  const [status,message]=map[code]??[500,"Internal server error"];
  return errorResponse(res,requestId,status,code,message);
}

export async function createRideController(req:Request,res:Response){const p=createRideSchema.safeParse(req.body);if(!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid ride request",p.error.flatten());try{return successResponse(res,req.requestId,await service.createRide(req.user!.id,p.data),201);}catch(e){return handleError(res,req.requestId,e);}}
export async function listRidesController(req:Request,res:Response){const p=rideListQuerySchema.safeParse(req.query);if(!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid query",p.error.flatten());try{return successResponse(res,req.requestId,await service.listRides(req.user!.id,p.data.status,p.data.limit,p.data.cursor));}catch(e){return handleError(res,req.requestId,e);}}
export async function getRideController(req:Request,res:Response){try{return successResponse(res,req.requestId,await service.getRide(req.user!.id,getRideId(req)));}catch(e){return handleError(res,req.requestId,e);}}
export async function cancelRideController(req:Request,res:Response){const p=cancelRideSchema.safeParse(req.body);if(!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid cancellation request",p.error.flatten());try{return successResponse(res,req.requestId,await service.cancelRide(req.user!.id,getRideId(req),p.data));}catch(e){return handleError(res,req.requestId,e);}}
export async function assignRideController(req:Request,res:Response){const p=assignRideSchema.safeParse(req.body);if(!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid assignment request",p.error.flatten());try{return successResponse(res,req.requestId,await service.assignRide(req.user!.id,getRideId(req),p.data),201);}catch(e){return handleError(res,req.requestId,e);}}
export async function acceptRideController(req:Request,res:Response){try{return successResponse(res,req.requestId,await service.acceptRide(req.user!.id,getRideId(req)));}catch(e){return handleError(res,req.requestId,e);}}
export async function rejectRideController(req:Request,res:Response){try{return successResponse(res,req.requestId,await service.rejectRide(req.user!.id,getRideId(req)));}catch(e){return handleError(res,req.requestId,e);}}
export async function addLocationController(req:Request,res:Response){const p=locationSchema.safeParse(req.body);if(!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid location",p.error.flatten());try{return successResponse(res,req.requestId,await service.addLocation(req.user!.id,getRideId(req),p.data),201);}catch(e){return handleError(res,req.requestId,e);}}
export async function addEventController(req:Request,res:Response){const p=rideEventSchema.safeParse(req.body);if(!p.success)return errorResponse(res,req.requestId,400,"VALIDATION_ERROR","Invalid ride event",p.error.flatten());try{return successResponse(res,req.requestId,await service.addRideEvent(req.user!.id,getRideId(req),p.data));}catch(e){return handleError(res,req.requestId,e);}}
export async function listEventsController(req:Request,res:Response){try{return successResponse(res,req.requestId,await service.listEvents(req.user!.id,getRideId(req)));}catch(e){return handleError(res,req.requestId,e);}}
export async function listLocationsController(req:Request,res:Response){try{return successResponse(res,req.requestId,await service.listLocations(req.user!.id,getRideId(req)));}catch(e){return handleError(res,req.requestId,e);}}
