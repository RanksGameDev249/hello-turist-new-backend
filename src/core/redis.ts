import { createClient } from "redis";
import "dotenv/config";

const redisUrl = process.env.REDIS_URL ?? (process.env.NODE_ENV === "production" ? "" : "redis://127.0.0.1:6379");

if (!redisUrl && process.env.NODE_ENV === "production") {
  throw new Error("REDIS_URL is required in production");
}

export const redis = createClient({ url: redisUrl });

redis.on("error", (error) => {
  console.error("REDIS_ERROR:", error);
});

let connectPromise: Promise<void> | null = null;

export async function connectRedis() {
  if (redis.isOpen) return;
  if (!connectPromise) {
    connectPromise = redis.connect()
      .then(() => undefined)
      .finally(() => {
        connectPromise = null;
      });
  }
  await connectPromise;
}
