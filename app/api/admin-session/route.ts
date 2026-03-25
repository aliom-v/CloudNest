import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  getCurrentAdminSessionEmail,
  isAdminEmail
} from "@/lib/auth";
import { getAdminAuthConfig, hasAdminAuthConfig } from "@/lib/env";
import type { AdminSessionResult } from "@/types/api";

export async function GET() {
  const email = await getCurrentAdminSessionEmail();

  if (!email) {
    return NextResponse.json(
      {
        success: false,
        message: "当前没有有效管理员会话。"
      },
      { status: 401 }
    );
  }

  return NextResponse.json<{
    success: true;
    message: string;
    data: AdminSessionResult;
  }>({
    success: true,
    message: "Admin session is active",
    data: {
      email,
      expiresAt: "active"
    }
  });
}

export async function POST(request: NextRequest) {
  if (!hasAdminAuthConfig()) {
    return NextResponse.json(
      {
        success: false,
        message: "管理员认证环境变量未配置完整。"
      },
      { status: 500 }
    );
  }

  let payload: {
    email?: string;
    password?: string;
  };

  try {
    payload = (await request.json()) as {
      email?: string;
      password?: string;
    };
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "请求体不是合法 JSON。"
      },
      { status: 400 }
    );
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password || "";

  if (!email || !password) {
    return NextResponse.json(
      {
        success: false,
        message: "邮箱和管理员密码都不能为空。"
      },
      { status: 400 }
    );
  }

  if (!isAdminEmail(email)) {
    return NextResponse.json(
      {
        success: false,
        message: "当前邮箱不在管理员白名单中。"
      },
      { status: 403 }
    );
  }

  const { loginPassword } = getAdminAuthConfig();
  if (password !== loginPassword) {
    return NextResponse.json(
      {
        success: false,
        message: "管理员密码不正确。"
      },
      { status: 403 }
    );
  }

  const session = createAdminSession(email);
  const response = NextResponse.json<{
    success: true;
    message: string;
    data: AdminSessionResult;
  }>({
    success: true,
    message: "Admin session created",
    data: {
      email,
      expiresAt: session.expiresAt
    }
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: session.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt)
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: "Admin session cleared"
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });

  return response;
}
