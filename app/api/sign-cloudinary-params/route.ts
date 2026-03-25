import { NextRequest, NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/auth";
import { buildSignedUploadParams } from "@/lib/cloudinary";
import {
  getPublicUploadConfig,
  getServerCloudinaryConfig,
  hasServerUploadSigningConfig,
  isPublicSignedUploadEnabled
} from "@/lib/env";
import { isSameOriginRequest } from "@/lib/upload-policy";
import type { SignedUploadParamsResult } from "@/types/api";

export async function POST(request: NextRequest) {
  if (!hasServerUploadSigningConfig()) {
    return NextResponse.json(
      {
        success: false,
        message: "签名上传未启用，当前环境仍应使用 unsigned upload preset。"
      },
      { status: 501 }
    );
  }

  if (isPublicSignedUploadEnabled()) {
    if (!isSameOriginRequest(request.headers.get("origin"), request.headers.get("host"))) {
      return NextResponse.json(
        {
          success: false,
          message: "公开 signed upload 仅允许从当前站点发起同源请求。"
        },
        { status: 403 }
      );
    }
  } else {
    const authorization = authorizeAdminRequest(request);

    if (!authorization.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "当前环境未开放公开 signed upload，请使用管理员会话访问。"
        },
        { status: authorization.status }
      );
    }
  }

  const { uploadFolder, defaultTags } = getPublicUploadConfig();
  const { apiKey, apiSecret } = getServerCloudinaryConfig();

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      {
        success: false,
        message: "签名上传所需的 Cloudinary 服务端密钥未配置完整。"
      },
      { status: 500 }
    );
  }

  const params = buildSignedUploadParams({
    apiKey,
    apiSecret,
    folder: uploadFolder,
    tags: defaultTags
  });

  return NextResponse.json<{
    success: true;
    message: string;
    data: SignedUploadParamsResult;
  }>({
    success: true,
    message: "Signed upload parameters generated",
    data: params
  });
}
