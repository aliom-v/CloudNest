import { NextRequest, NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/auth";
import { listCloudinaryAssets, searchCloudinaryAssets } from "@/lib/cloudinary";
import { getPublicUploadConfig, getServerCloudinaryConfig } from "@/lib/env";
import type { AdminAssetsResult } from "@/types/api";

const DEFAULT_MAX_RESULTS = 24;
const HARD_MAX_RESULTS = 50;

export async function GET(request: NextRequest) {
  const authorization = authorizeAdminRequest(request);

  if (!authorization.ok) {
    return NextResponse.json(
      {
        success: false,
        message: authorization.message
      },
      { status: authorization.status }
    );
  }

  const { cloudName, uploadFolder } = getPublicUploadConfig();
  const { apiKey, apiSecret } = getServerCloudinaryConfig();

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        success: false,
        message: "Cloudinary 服务端密钥未配置完整。"
      },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const nextCursor = searchParams.get("cursor") || undefined;
  const query = searchParams.get("q")?.trim().toLowerCase() || "";
  const rawMaxResults = Number(searchParams.get("maxResults") || DEFAULT_MAX_RESULTS);
  const maxResults = Number.isFinite(rawMaxResults)
    ? Math.max(1, Math.min(rawMaxResults, HARD_MAX_RESULTS))
    : DEFAULT_MAX_RESULTS;

  try {
    const result = query
      ? await searchCloudinaryAssets({
          cloudName,
          apiKey,
          apiSecret,
          prefix: uploadFolder,
          query,
          maxResults,
          nextCursor
        })
      : await listCloudinaryAssets({
          cloudName,
          apiKey,
          apiSecret,
          prefix: uploadFolder,
          maxResults,
          nextCursor
        });

    return NextResponse.json<{
      success: true;
      message: string;
      data: AdminAssetsResult;
    }>({
      success: true,
      message: "Assets retrieved successfully",
      data: {
        assets: result.assets,
        nextCursor: result.nextCursor
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "获取 Cloudinary 资源列表失败。"
      },
      { status: 502 }
    );
  }
}
