import crypto from "crypto";
import jwt from "jsonwebtoken";

import { prisma } from "../../core/prisma";
import { redis, connectRedis } from "../../core/redis";

const OTP_TTL_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

function normalizePhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  throw new Error("INVALID_PHONE_NUMBER");
}

function otpKey(phone: string) {
  return `auth:otp:${phone}`;
}

function cooldownKey(phone: string) {
  return `auth:otp:cooldown:${phone}`;
}

function hashOtp(otp: string) {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper) throw new Error("OTP_NOT_CONFIGURED");
  return crypto.createHmac("sha256", pepper).update(otp).digest("hex");
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

async function sendSms(phone: string, otp: string) {
  const provider = (process.env.SMS_PROVIDER ?? "twilio").toLowerCase();
  if (provider !== "twilio") throw new Error("SMS_PROVIDER_NOT_SUPPORTED");

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) throw new Error("SMS_NOT_CONFIGURED");

  const body = new URLSearchParams({
    To: phone,
    From: from,
    Body: `Your Hello Kurukshetra verification code is ${otp}. It expires in 5 minutes.`,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("SMS_PROVIDER_ERROR:", response.status, detail.slice(0, 500));
    throw new Error("SMS_DELIVERY_FAILED");
  }
}

async function findUserByPhone(phone: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM users WHERE phone = ${phone} AND status = 'ACTIVE' LIMIT 1
  `;
  return rows[0] ?? null;
}

async function issueSession(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true, email: true, status: true, preferredLanguage: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.status !== "ACTIVE") throw new Error("ACCOUNT_NOT_ACTIVE");

  const accessToken = jwt.sign(
    { sub: user.id, username: user.username },
    process.env.ACCESS_TOKEN_SECRET!,
    { expiresIn: "15m" }
  );
  const refreshToken = crypto.randomBytes(64).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  await prisma.refreshSession.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken, user };
}

export async function requestOtp(inputPhone: string) {
  const phone = normalizePhone(inputPhone);
  await connectRedis();

  const existing = await findUserByPhone(phone);
  if (!existing) throw new Error("PHONE_NOT_REGISTERED");

  if (await redis.exists(cooldownKey(phone))) throw new Error("OTP_RATE_LIMITED");

  const otp = generateOtp();
  const record = JSON.stringify({ hash: hashOtp(otp), attempts: 0 });
  await redis.set(otpKey(phone), record, { EX: OTP_TTL_SECONDS });
  await redis.set(cooldownKey(phone), "1", { EX: RESEND_COOLDOWN_SECONDS });

  try {
    await sendSms(phone, otp);
  } catch (error) {
    await redis.del(otpKey(phone), cooldownKey(phone));
    throw error;
  }

  return { phone, expiresInSeconds: OTP_TTL_SECONDS, resendAfterSeconds: RESEND_COOLDOWN_SECONDS };
}

export async function verifyOtp(inputPhone: string, inputOtp: string) {
  const phone = normalizePhone(inputPhone);
  const otp = inputOtp.trim();
  if (!/^\d{6}$/.test(otp)) throw new Error("INVALID_OTP");

  await connectRedis();
  const raw = await redis.get(otpKey(phone));
  if (!raw) throw new Error("OTP_EXPIRED");

  const record = JSON.parse(raw) as { hash: string; attempts: number };
  if (record.attempts >= MAX_ATTEMPTS) {
    await redis.del(otpKey(phone));
    throw new Error("OTP_ATTEMPTS_EXCEEDED");
  }

  if (hashOtp(otp) !== record.hash) {
    record.attempts += 1;
    const ttl = await redis.ttl(otpKey(phone));
    if (ttl > 0) await redis.set(otpKey(phone), JSON.stringify(record), { EX: ttl });
    throw new Error("INVALID_OTP");
  }

  await redis.del(otpKey(phone), cooldownKey(phone));
  const user = await findUserByPhone(phone);
  if (!user) throw new Error("PHONE_NOT_REGISTERED");
  return issueSession(user.id);
}
