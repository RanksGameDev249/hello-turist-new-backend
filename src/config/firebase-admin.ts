import jwt, { JwtPayload } from "jsonwebtoken";

const CERT_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

type FirebaseToken = JwtPayload & {
  uid: string;
  user_id?: string;
  email?: string;
  name?: string;
  phone_number?: string;
  email_verified?: boolean;
};

let cachedCertificates: Record<string, string> | null = null;
let certificatesExpireAt = 0;

async function getCertificates() {
  if (cachedCertificates && Date.now() < certificatesExpireAt) {
    return cachedCertificates;
  }

  const response = await fetch(CERT_URL);
  if (!response.ok) {
    throw new Error("FIREBASE_CERTIFICATE_FETCH_FAILED");
  }

  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

  cachedCertificates = (await response.json()) as Record<string, string>;
  certificatesExpireAt = Date.now() + Math.max(60, maxAgeSeconds - 60) * 1000;

  return cachedCertificates;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseToken> {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error("FIREBASE_ADMIN_NOT_CONFIGURED");
  }

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded !== "object" || !decoded.header?.kid) {
    throw new Error("INVALID_FIREBASE_ID_TOKEN");
  }

  if (decoded.header.alg !== "RS256") {
    throw new Error("INVALID_FIREBASE_ID_TOKEN");
  }

  const certificates = await getCertificates();
  const publicKey = certificates[decoded.header.kid];
  if (!publicKey) {
    cachedCertificates = null;
    certificatesExpireAt = 0;
    const refreshed = await getCertificates();
    const refreshedKey = refreshed[decoded.header.kid];
    if (!refreshedKey) throw new Error("INVALID_FIREBASE_ID_TOKEN");
    return verifyWithKey(idToken, refreshedKey, projectId);
  }

  return verifyWithKey(idToken, publicKey, projectId);
}

function verifyWithKey(idToken: string, publicKey: string, projectId: string): FirebaseToken {
  const payload = jwt.verify(idToken, publicKey, {
    algorithms: ["RS256"],
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  }) as JwtPayload;

  const uid = typeof payload.sub === "string" ? payload.sub : undefined;
  if (!uid) throw new Error("INVALID_FIREBASE_ID_TOKEN");

  return { ...payload, uid };
}
