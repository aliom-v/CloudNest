import { NextRequest, NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/auth";
import { deleteManagedAsset } from "@/lib/delete-service";
import type { BatchDeleteImagesRequest, BatchDeleteImagesResult } from "@/types/api";

export async function POST(request: NextRequest) {
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

  let payload: BatchDeleteImagesRequest;

  try {
    payload = (await request.json()) as BatchDeleteImagesRequest;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "请求体不是合法 JSON。"
      },
      { status: 400 }
    );
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message: "items 不能为空。"
      },
      { status: 400 }
    );
  }

  const results = await Promise.all(
    payload.items.map(async (item) => {
      const result = await deleteManagedAsset({
        actorEmail: authorization.email,
        payload: item
      });

      if (result.success) {
        return {
          success: true as const,
          data: result.data
        };
      }

      return {
        success: false as const,
        status: result.status,
        message: result.message,
        publicId: item.publicId
      };
    })
  );

  const succeeded = results.filter((result) => result.success).length;
  const failed = results.length - succeeded;
  const responseStatus = failed > 0 ? (succeeded > 0 ? 207 : 502) : 200;

  return NextResponse.json<{
    success: true;
    message: string;
    data: BatchDeleteImagesResult;
  }>(
    {
      success: true,
      message:
        failed === 0
          ? "Batch delete completed successfully"
          : succeeded > 0
            ? "Batch delete completed with partial failures"
            : "Batch delete failed",
      data: {
        total: results.length,
        succeeded,
        failed,
        results
      }
    },
    { status: responseStatus }
  );
}
