import { Request, Response } from "express";
import { getRide, subscribeRideLocation } from "./ride-realtime-stream";

export async function rideLocationStreamController(req: Request, res: Response) {
  const rideId = typeof req.params.id === "string" ? req.params.id : "";
  if (!rideId || !req.user?.id) return res.status(400).end();
  try {
    await getRide(rideId, req.user.id);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    return res.status(code === "RIDE_NOT_FOUND" ? 404 : 403).json({ error: code });
  }
  res.status(200).set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  const unsubscribe = subscribeRideLocation(rideId, update => res.write(`event: location\ndata: ${JSON.stringify(update)}\n\n`));
  res.write(`event: ready\ndata: ${JSON.stringify({ rideId })}\n\n`);
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 15000);
  req.on("close", () => { clearInterval(heartbeat); unsubscribe(); });
}
