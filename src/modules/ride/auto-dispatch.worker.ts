import { prisma } from "../../core/prisma";
import { dispatchRide } from "./auto-dispatch.service";

const intervalMs = Math.max(15_000, Number(process.env.DISPATCH_MONITOR_INTERVAL_MS || 15_000));

/** Recovers SEARCHING rides and starts the next automatic candidate offer after rejection/expiry/restart. */
export function startAutoDispatchWorker() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const rides = await prisma.ride.findMany({
        where: {
          status: "SEARCHING",
          serviceType: { in: ["RIDE_ONLY", "RIDE_AND_GUIDE"] },
          assignments: { none: { status: { in: ["OFFERED", "ACCEPTED"] } } },
        },
        select: { id: true },
        take: 50,
      });
      for (const ride of rides) void dispatchRide(ride.id).catch((error) => console.error("Automatic dispatch worker failed", ride.id, error));
    } catch (error) {
      console.error("Automatic dispatch worker scan failed", error);
    } finally {
      running = false;
    }
  };
  void tick();
  return setInterval(() => void tick(), intervalMs);
}
