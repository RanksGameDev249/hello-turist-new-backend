import crypto from "crypto";
import jwt from "jsonwebtoken";

import { prisma } from "../../core/prisma";
import { verifyFirebaseIdToken } from "../../config/firebase-admin";

function normalizePhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  throw new Error("INVALID_PHONE_NUMBER");
}

async function findUserByPhone(phone: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM users WHERE phone = ${phone} AND status = 'ACTIVE' LIMIT 1
  `;
  return rows[0] ?? null;
}

async function findUserByFirebaseUid(firebaseUid: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM users WHERE firebase_uid = ${firebaseUid} AND status = 'ACTIVE' LIMIT 1
  `;
  return rows[0] ?? null;
}

async function issueSession(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      status: true,
      preferredLanguage: true,
    },
  });

  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.status !== "ACTIVE") throw new Error("ACCOUNT_NOT_ACTIVE");

  const phoneRows = await prisma.$queryRaw<Array<{ phone: string | null }>>`
    SELECT phone FROM users WHERE id = ${userId}::uuid LIMIT 1
  `;

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

  return {
    accessToken,
    refreshToken,
    user: {
      ...user,
      phone: phoneRows[0]?.phone ?? null,
    },
  };
}

/**
 * Firebase Phone Authentication sends the SMS OTP and performs the client-side
 * verification. The app then sends the Firebase ID token here. The backend
 * verifies the token cryptographically and issues the application's session.
 */
export async function verifyFirebasePhoneToken(idToken: string, inputPhone?: string) {
  if (!idToken.trim()) throw new Error("INVALID_FIREBASE_ID_TOKEN");

  const decoded = await verifyFirebaseIdToken(idToken.trim());
  const firebaseUid = decoded.uid;
  const tokenPhone = typeof decoded.phone_number === "string" ? normalizePhone(decoded.phone_number) : null;
  const requestedPhone = inputPhone?.trim() ? normalizePhone(inputPhone) : null;

  if (!tokenPhone) throw new Error("FIREBASE_PHONE_NUMBER_MISSING");
  if (requestedPhone && requestedPhone !== tokenPhone) throw new Error("PHONE_MISMATCH");

  let user = await findUserByFirebaseUid(firebaseUid);
  if (!user) user = await findUserByPhone(tokenPhone);
  if (!user) throw new Error("PHONE_NOT_REGISTERED");

  const owner = await findUserByFirebaseUid(firebaseUid);
  if (!owner) {
    const existingPhoneOwner = await findUserByPhone(tokenPhone);
    if (existingPhoneOwner && existingPhoneOwner.id !== user.id) {
      throw new Error("PHONE_ALREADY_EXISTS");
    }

    await prisma.$executeRaw`
      UPDATE users
      SET firebase_uid = ${firebaseUid}, phone = ${tokenPhone}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${user.id}::uuid
    `;
  }

  return issueSession(user.id);
}

/**
 * Kept as an explicit migration response for old clients. OTP delivery must not
 * be performed by the backend because Firebase Phone Authentication owns the
 * SMS verification flow.
 */
export async function requestOtp(inputPhone: string) {
  const phone = normalizePhone(inputPhone);
  const existing = await findUserByPhone(phone);
  if (!existing) throw new Error("PHONE_NOT_REGISTERED");
  return {
    phone,
    provider: "firebase",
    message: "Start Firebase Phone Authentication on the client and submit the Firebase ID token to /auth/otp/verify.",
  };
}

export async function verifyOtp(inputPhone: string, inputOtp: string) {
  // inputOtp is now the Firebase ID token for backward-compatible controller wiring.
  return verifyFirebasePhoneToken(inputOtp, inputPhone);
}
