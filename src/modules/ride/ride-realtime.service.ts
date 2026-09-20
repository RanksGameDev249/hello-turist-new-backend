import { EventEmitter } from "node:events";

export type RideLocationUpdate = {
  rideId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
};

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export function publishRideLocation(update: RideLocationUpdate) {
  emitter.emit(`ride:${update.rideId}:location`, update);
}

export function subscribeRideLocation(rideId: string, listener: (update: RideLocationUpdate) => void) {
  const event = `ride:${rideId}:location`;
  emitter.on(event, listener);
  return () => emitter.off(event, listener);
}
