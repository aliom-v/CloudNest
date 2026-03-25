import { NextResponse } from "next/server";

import { buildSignedUploadParams } from "@/lib/cloudinary";
import { getPublicUploadConfig, getServerCloudinaryConfig, hasServerUploadSigningConfig } from "@/lib/env";
import type { SignedUploadParamsResult } from "@/types/api";

export async function POST() {
  if (!hasServerUploadSigningConfig()) {
    return NextResponse.json(
      {
        success: false,
        message: "签名上传未启用，当前环境仍应使用 unsigned upload preset。"
      },
      { status: 501 }
    );
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
