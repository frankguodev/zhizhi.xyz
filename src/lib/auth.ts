import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";

const sessionCookieName = "zz_session";
const adminSessionCookieName = "zz_admin_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;
const adminSessionMaxAgeSeconds = 60 * 60 * 2;
// Cloudflare Web Crypto in Workers currently rejects PBKDF2 iterations above 100000.
const maxSupportedPasswordIterations = 100_000;
const passwordIterations = maxSupportedPasswordIterations;

type SessionType = "user" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: "user" | "admin";
  status: "active" | "disabled";
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function timingSafeEqual(a: string, b: string) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < left.length; index++) {
    result |= left[index] ^ right[index];
  }
  return result === 0;
}

async function hmacSha256(value: string) {
  const secret = process.env.AUTH_SECRET || "dev-only-zhizhi-auth-secret-change-me";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(signature));
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: passwordIterations,
      hash: "SHA-256",
    },
    key,
    256,
  );

  return `pbkdf2:${passwordIterations}:${bytesToBase64(salt)}:${bytesToBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iterationsText, saltText, hashText] = stored.split(":");
  const iterations = Number(iterationsText);

  if (
    scheme !== "pbkdf2" ||
    !Number.isFinite(iterations) ||
    iterations <= 0 ||
    iterations > maxSupportedPasswordIterations ||
    !saltText ||
    !hashText
  ) {
    return false;
  }

  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: base64ToBytes(saltText),
        iterations,
        hash: "SHA-256",
      },
      key,
      256,
    );

    return timingSafeEqual(hashText, bytesToBase64(new Uint8Array(bits)));
  } catch {
    return false;
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function publicUser(row: typeof users.$inferSelect): AuthUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    status: row.status,
  };
}

export async function createUser(email: string, password: string) {
  const db = await getDb();
  const normalizedEmail = normalizeEmail(email);
  const timestamp = new Date();
  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    displayName: normalizedEmail.split("@")[0] || null,
    avatarUrl: null,
    role: "user" as const,
    status: "active" as const,
    preferredLocale: "zh" as const,
    preferredReadingMode: "full" as const,
    emailVerifiedAt: null,
    lastLoginAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.insert(users).values(user);
  return publicUser(user);
}

export async function authenticateUser(email: string, password: string) {
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);
  const user = rows[0];

  if (!user || user.status !== "active") {
    return null;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return null;
  }

  await db.update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
  return publicUser(user);
}

export async function getUserById(id: string) {
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const user = rows[0];

  if (!user || user.status !== "active") {
    return null;
  }

  return publicUser(user);
}

export async function createSessionToken(user: AuthUser, type: SessionType = "user", maxAgeSeconds = sessionMaxAgeSeconds) {
  const payload = {
    sub: user.id,
    email: user.email,
    typ: type,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const encodedPayload = bytesToBase64(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmacSha256(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

async function readSessionToken(token: string, expectedType: SessionType): Promise<{ sub: string; exp: number; typ: SessionType } | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = await hmacSha256(payload);
  if (!timingSafeEqual(signature, expected)) {
    return null;
  }

  const parsed = JSON.parse(new TextDecoder().decode(base64ToBytes(payload))) as { sub?: string; exp?: number; typ?: string };
  if (!parsed.sub || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000) || parsed.typ !== expectedType) {
    return null;
  }

  return { sub: parsed.sub, exp: parsed.exp, typ: parsed.typ };
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function setSessionCookie(user: AuthUser) {
  const token = await createSessionToken(user, "user", sessionMaxAgeSeconds);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, cookieOptions(sessionMaxAgeSeconds));
}

export async function setAdminSessionCookie(user: AuthUser) {
  const token = await createSessionToken(user, "admin", adminSessionMaxAgeSeconds);
  const cookieStore = await cookies();
  cookieStore.set(adminSessionCookieName, token, cookieOptions(adminSessionMaxAgeSeconds));
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(adminSessionCookieName);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const session = await readSessionToken(token, "user").catch(() => null);
  if (!session) {
    return null;
  }

  return getUserById(session.sub);
}

export async function getCurrentAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminSessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const session = await readSessionToken(token, "admin").catch(() => null);
  if (!session) {
    return null;
  }

  const user = await getUserById(session.sub);
  if (!user || user.role !== "admin") {
    return null;
  }

  return user;
}
