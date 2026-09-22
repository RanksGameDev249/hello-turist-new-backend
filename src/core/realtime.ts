import crypto from "node:crypto";
import { connectRedis, redis } from "./redis";

const INSTANCE_ID = `${process.pid}-${crypto.randomUUID()}`;
const PRESENCE_TTL_SECONDS = 45;

export async function acquireDistributedLock(name: string, ttlSeconds = 15) {
  await connectRedis();
  const key = `lock:${name}`;
  const token = `${INSTANCE_ID}:${crypto.randomUUID()}`;
  const acquired = await redis.set(key, token, { NX: true, EX: ttlSeconds });
  if (acquired !== "OK") return null;
  return { key, token };
}

export async function releaseDistributedLock(lock: { key: string; token: string }) {
  await connectRedis();
  await redis.eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    { keys: [lock.key], arguments: [lock.token] },
  );
}

export async function setPresence(userId: string, channel: string) {
  await connectRedis();
  const key = `presence:${channel}:${userId}`;
  await redis.set(key, INSTANCE_ID, { EX: PRESENCE_TTL_SECONDS });
  return key;
}

export async function refreshPresence(key: string) {
  await connectRedis();
  await redis.expire(key, PRESENCE_TTL_SECONDS);
}

export async function clearPresence(key: string) {
  await connectRedis();
  await redis.del(key);
}

export async function publishRealtimeEvent(channel: string, type: string, payload: unknown) {
  await connectRedis();
  const stream = `events:${channel}`;
  const id = await redis.xAdd(stream, "*", { type, payload: JSON.stringify(payload) });
  await redis.xTrim(stream, "MAXLEN", 1000);
  return id;
}

export async function replayRealtimeEvents(channel: string, lastEventId?: string) {
  await connectRedis();
  const stream = `events:${channel}`;
  const start = lastEventId ? `(${lastEventId}` : "-";
  const rows = await redis.xRange(stream, start, "+", { COUNT: 100 });
  return rows.map((row) => ({ id: row.id, type: row.message.type, payload: JSON.parse(row.message.payload ?? "null") }));
}
