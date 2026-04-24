import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { getAdminAuthConfig } from "@/lib/env";

type AdminAuthorizationResult =
  | {
      ok: true;
      email: string;
    }
  | {
      ok: false;
      status: number;
      message: string;
    };

type AdminSessionPayload = {
  email: string;
  exp: number;
};

export const ADMIN_SESSION_COOKIE = "__Host-cloudnest_admin_session";

export function getAllowedAdminEmails(): string[] {
  const raw = process.env.AUTH_ALLOWED_EMAILS || "";

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  return getAllowedAdminEmails().includes(email.trim().toLowerCase());
}

export function getRequestAdminEmail(request: NextRequest): string | null {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = token ? verifyAdminSessionToken(token) : null;
  if (session?.email) {
    return session.email;
  }

  return null;
}

export function authorizeAdminRequest(request: NextRequest): AdminAuthorizationResult {
  const adminEmail = getRequestAdminEmail(request);

  if (!adminEmail) {
    return {
      ok: false,
      status: 401,
      message: "缺少有效管理员会话，请先登录后台。"
    };
  }

  if (!isAdminEmail(adminEmail)) {
    return {
      ok: false,
      status: 403,
      message: "当前邮箱不在管理员白名单中。"
    };
  }

  return {
    ok: true,
    email: adminEmail
  };
}

export function createAdminSession(email: string): { token: string; expiresAt: string } {
  const { sessionSecret, sessionTtlHours } = getAdminAuthConfig();
  const safeTtlHours = Number.isFinite(sessionTtlHours) && sessionTtlHours > 0 ? sessionTtlHours : 24;
  const expiresAt = new Date(Date.now() + safeTtlHours * 60 * 60 * 1000);
  const payload: AdminSessionPayload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(expiresAt.getTime() / 1000)
  };

  return {
    token: signAdminSessionPayload(payload, sessionSecret),
    expiresAt: expiresAt.toISOString()
  };
}

export async function getCurrentAdminSessionEmail(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  const session = token ? verifyAdminSessionToken(token) : null;

  return session?.email || null;
}

export function verifyAdminSessionToken(token: string): AdminSessionPayload | null {
  const { sessionSecret } = getAdminAuthConfig();
  if (!sessionSecret) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", sessionSecret)
    .update(encodedPayload)
    .digest("base64url");

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AdminSessionPayload;

    if (!payload.email || !payload.exp) {
      return null;
    }

    if (payload.exp * 1000 < Date.now()) {
      return null;
    }

    if (!isAdminEmail(payload.email)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function signAdminSessionPayload(payload: AdminSessionPayload, sessionSecret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", sessionSecret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
