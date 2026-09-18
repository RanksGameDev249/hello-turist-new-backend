import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../../core/prisma";

function generateRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function issueSession(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      status: true,
      preferredLanguage: true,
      profileImageUrl: true,
    },
  });

  if (!user || user.status !== "ACTIVE") throw new Error("ACCOUNT_NOT_ACTIVE");

  const accessToken = jwt.sign(
    { sub: user.id, username: user.username },
    process.env.ACCESS_TOKEN_SECRET!,
    { expiresIn: "15m" }
  );
  const refreshToken = generateRefreshToken();
  await prisma.refreshSession.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken,
    refreshToken,
    user,
    profileComplete: Boolean(user.phone),
  };
}

function normalizeUsername(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 60);
  return normalized.length >= 3 ? normalized : `user${crypto.randomInt(100000, 999999)}`;
}

async function uniqueUsername(base: string) {
  const normalized = normalizeUsername(base);
  let candidate = normalized;
  for (let index = 0; index < 20; index += 1) {
    const exists = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!exists) return candidate;
    candidate = `${normalized.slice(0, 54)}${crypto.randomInt(1000, 9999)}`;
  }
  return `user${crypto.randomInt(10000000, 99999999)}`;
}

async function googleTokenInfo(idToken: string) {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error("INVALID_GOOGLE_TOKEN");

  const audience = String(data.aud ?? "");
  const expectedAudience = process.env.GOOGLE_WEB_CLIENT_ID?.trim();
  const issuer = String(data.iss ?? "");
  const email = String(data.email ?? "").trim().toLowerCase();
  const subject = String(data.sub ?? "");
  const emailVerified = String(data.email_verified ?? "").toLowerCase() === "true" || data.email_verified === true;

  if (!expectedAudience || audience !== expectedAudience || !subject || !email || !emailVerified) {
    throw new Error("INVALID_GOOGLE_TOKEN");
  }
  if (issuer !== "accounts.google.com" && issuer !== "https://accounts.google.com") {
    throw new Error("INVALID_GOOGLE_TOKEN");
  }

  return {
    subject,
    email,
    name: String(data.name ?? email.split("@")[0]),
    picture: String(data.picture ?? "").trim() || null,
  };
}

export async function loginWithGoogle(idToken: string) {
  const google = await googleTokenInfo(idToken);

  let user = await prisma.user.findUnique({ where: { googleSubject: google.subject } });

  if (!user) {
    const emailUser = await prisma.user.findUnique({ where: { email: google.email } });
    if (emailUser) {
      if (emailUser.googleSubject && emailUser.googleSubject !== google.subject) {
        throw new Error("GOOGLE_ACCOUNT_CONFLICT");
      }
      user = await prisma.user.update({
        where: { id: emailUser.id },
        data: {
          googleSubject: google.subject,
          name: emailUser.name || google.name,
          profileImageUrl: google.picture ?? emailUser.profileImageUrl,
        },
      });
    } else {
      const username = await uniqueUsername(google.email.split("@")[0]);
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
      user = await prisma.user.create({
        data: {
          name: google.name,
          username,
          email: google.email,
          googleSubject: google.subject,
          profileImageUrl: google.picture,
          passwordHash,
        },
      });
    }
  } else if (user.status !== "ACTIVE") {
    throw new Error("ACCOUNT_NOT_ACTIVE");
  }

  return issueSession(user.id);
}

async function firebaseLookup(idToken: string) {
  const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim();
  if (!apiKey) throw new Error("FIREBASE_NOT_CONFIGURED");

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = (await response.json()) as { users?: Array<Record<string, unknown>> };
  if (!response.ok || !data.users?.length) throw new Error("INVALID_FIREBASE_TOKEN");

  const account = data.users[0];
  const uid = String(account.localId ?? "");
  const phone = String(account.phoneNumber ?? "").trim();
  const disabled = account.disabled === true;
  if (!uid || !phone || disabled) throw new Error("INVALID_FIREBASE_PHONE_ACCOUNT");

  return {
    uid,
    phone,
    email: String(account.email ?? "").trim().toLowerCase() || null,
    name: String(account.displayName ?? "").trim() || null,
    picture: String(account.photoUrl ?? "").trim() || null,
  };
}

export async function linkOrLoginWithFirebasePhone(idToken: string, currentUserId?: string) {
  const firebase = await firebaseLookup(idToken);

  if (currentUserId) {
    const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!currentUser || currentUser.status !== "ACTIVE") throw new Error("ACCOUNT_NOT_ACTIVE");

    const existingFirebase = await prisma.user.findUnique({ where: { firebaseUid: firebase.uid } });
    if (existingFirebase && existingFirebase.id !== currentUserId) throw new Error("PHONE_ACCOUNT_ALREADY_LINKED");

    const existingPhone = await prisma.user.findUnique({ where: { phone: firebase.phone } });
    if (existingPhone && existingPhone.id !== currentUserId) throw new Error("PHONE_ALREADY_REGISTERED");

    const user = await prisma.user.update({
      where: { id: currentUserId },
      data: {
        phone: firebase.phone,
        firebaseUid: firebase.uid,
        ...(firebase.picture && !currentUser.profileImageUrl ? { profileImageUrl: firebase.picture } : {}),
      },
    });
    return {
      ...(await issueSession(user.id)),
      phoneVerified: true,
    };
  }

  let user = await prisma.user.findUnique({ where: { firebaseUid: firebase.uid } });
  if (!user) user = await prisma.user.findUnique({ where: { phone: firebase.phone } });
  if (!user && firebase.email) user = await prisma.user.findUnique({ where: { email: firebase.email } });

  if (!user) {
    const username = await uniqueUsername(firebase.email?.split("@")[0] ?? `user${firebase.phone.slice(-8)}`);
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
    user = await prisma.user.create({
      data: {
        name: firebase.name ?? `User ${firebase.phone.slice(-4)}`,
        username,
        email: firebase.email,
        phone: firebase.phone,
        firebaseUid: firebase.uid,
        profileImageUrl: firebase.picture,
        passwordHash,
      },
    });
  } else {
    if (user.status !== "ACTIVE") throw new Error("ACCOUNT_NOT_ACTIVE");
    if (user.firebaseUid && user.firebaseUid !== firebase.uid) throw new Error("PHONE_ACCOUNT_ALREADY_LINKED");
    user = await prisma.user.update({
      where: { id: user.id },
      data: { phone: firebase.phone, firebaseUid: firebase.uid },
    });
  }

  return {
    ...(await issueSession(user.id)),
    phoneVerified: true,
  };
}
