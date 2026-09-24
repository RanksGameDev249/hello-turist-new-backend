import crypto from "node:crypto";
import type { Server, IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import jwt from "jsonwebtoken";
import { clearPresence, publishRealtimeEvent, refreshPresence, replayRealtimeEvents, setPresence } from "../core/realtime";

interface Client { socket: Duplex; userId: string; presenceKey: string; channel: string; buffer: Buffer; }
const clients = new Set<Client>();

function frame(text: string) {
  const payload = Buffer.from(text);
  const header = payload.length < 126 ? Buffer.from([0x81, payload.length]) : Buffer.concat([Buffer.from([0x81, 126]), Buffer.alloc(2)]);
  if (payload.length >= 126 && payload.length < 65536) header.writeUInt16BE(payload.length, 2);
  return Buffer.concat([header, payload]);
}

function send(client: Client, data: unknown) { if (!client.socket.destroyed) client.socket.write(frame(JSON.stringify(data))); }
function authenticate(req: IncomingMessage) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const token = url.searchParams.get("token") ?? req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try { return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as { sub?: string }; } catch { return null; }
}

async function handleMessage(client: Client, raw: string) {
  let message: { type?: string; payload?: unknown };
  try { message = JSON.parse(raw); } catch { return send(client, { type: "error", code: "INVALID_JSON" }); }
  if (message.type === "ping") return send(client, { type: "pong" });
  if (message.type === "publish") {
    await publishRealtimeEvent(client.channel, "message", { userId: client.userId, payload: message.payload });
    return;
  }
  send(client, { type: "error", code: "UNKNOWN_MESSAGE_TYPE" });
}

function consumeFrames(client: Client) {
  while (client.buffer.length >= 2) {
    const first = client.buffer[0]; const second = client.buffer[1];
    const opcode = first & 0x0f; const masked = (second & 0x80) !== 0; let length = second & 0x7f; let offset = 2;
    if (length === 126) { if (client.buffer.length < 4) return; length = client.buffer.readUInt16BE(2); offset = 4; }
    if (length === 127 || !masked) return client.socket.destroy();
    if (client.buffer.length < offset + 4 + length) return;
    const mask = client.buffer.subarray(offset, offset + 4); offset += 4;
    const data = Buffer.from(client.buffer.subarray(offset, offset + length));
    for (let i = 0; i < data.length; i++) data[i] ^= mask[i % 4];
    client.buffer = client.buffer.subarray(offset + length);
    if (opcode === 0x8) return client.socket.end();
    if (opcode === 0x9) { client.socket.write(Buffer.from([0x8a, 0])); continue; }
    if (opcode === 0x1) void handleMessage(client, data.toString("utf8"));
  }
}

export function attachWebSocketServer(server: Server) {
  server.on("upgrade", async (req, socket) => {
    const user = authenticate(req);
    const url = new URL(req.url ?? "/", "http://localhost");
    const channel = url.searchParams.get("channel")?.trim();
    if (!user?.sub || !channel || !/^[-a-zA-Z0-9_:]{1,100}$/.test(channel)) return socket.destroy();

    const key = req.headers["sec-websocket-key"];
    if (!key || req.headers.upgrade?.toLowerCase() !== "websocket") return socket.destroy();
    const accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);

    const presenceKey = await setPresence(user.sub, channel);
    const client: Client = { socket, userId: user.sub, channel, presenceKey, buffer: Buffer.alloc(0) };
    clients.add(client);
    send(client, { type: "connected", channel });
    try { for (const event of await replayRealtimeEvents(channel, url.searchParams.get("lastEventId") ?? undefined)) send(client, event); } catch (error) { console.error("REALTIME_REPLAY_ERROR:", error); }
    socket.on("data", (chunk) => { client.buffer = Buffer.concat([client.buffer, chunk]); consumeFrames(client); });
    const heartbeat = setInterval(() => void refreshPresence(presenceKey).catch(() => undefined), 15000);
    const cleanup = () => { clearInterval(heartbeat); clients.delete(client); void clearPresence(presenceKey).catch(() => undefined); };
    socket.on("close", cleanup); socket.on("error", cleanup);
  });
}
