import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "threadline_admin_session";
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type AdminSession = {
  role: "admin";
  issuedAt: number;
  expiresAt: number;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for admin authentication.`);
  }

  return value;
}

function getAdminSessionSecret() {
  return getRequiredEnv("ADMIN_SESSION_SECRET");
}

function getAdminPassword() {
  return getRequiredEnv("ADMIN_PASSWORD");
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", getAdminSessionSecret()).update(payload).digest("base64url");
}

function timingSafeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function sanitizeInternalPath(value: string | null | undefined, fallback = "/admin") {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return fallback;
  }

  return trimmed;
}

export function createAdminSessionToken(now = Date.now()) {
  const session: AdminSession = {
    role: "admin",
    issuedAt: now,
    expiresAt: now + ADMIN_SESSION_TTL_MS,
  };

  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

export function parseAdminSessionToken(token: string | undefined | null): AdminSession | undefined {
  if (!token) {
    return undefined;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return undefined;
  }

  const expectedSignature = signPayload(payload);
  if (!timingSafeEquals(signature, expectedSignature)) {
    return undefined;
  }

  try {
    const session = JSON.parse(base64UrlDecode(payload)) as AdminSession;
    if (session.role !== "admin" || typeof session.issuedAt !== "number" || typeof session.expiresAt !== "number") {
      return undefined;
    }

    if (Date.now() > session.expiresAt) {
      return undefined;
    }

    return session;
  } catch {
    return undefined;
  }
}

export function getAdminSessionFromCookieValue(token: string | undefined | null) {
  return parseAdminSessionToken(token);
}

export async function getAdminSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return getAdminSessionFromCookieValue(token);
}

export function getAdminSessionFromRequest(request: Request) {
  const token = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");

  return getAdminSessionFromCookieValue(token);
}

export async function requireAdminPage(nextPath: string) {
  if (!(await getAdminSessionFromCookies())) {
    redirect(`/admin/login?next=${encodeURIComponent(sanitizeInternalPath(nextPath))}`);
  }
}

export function isAdminPasswordValid(password: string) {
  return timingSafeEquals(password, getAdminPassword());
}

export function adminSessionCookieOptions(expiresAt: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  };
}

export function setAdminSessionCookie(response: NextResponse, token: string, expiresAt: number) {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, adminSessionCookieOptions(expiresAt));
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}
