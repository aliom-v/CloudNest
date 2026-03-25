import { NextRequest, NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/auth";
import { deleteManagedAsset } from "@/lib/delete-service";
import type { DeleteImageRequest, DeleteImageResult } from "@/types/api";

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

  let payload: DeleteImageRequest;

  try {
    payload = (await request.json()) as DeleteImageRequest;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "请求体不是合法 JSON。"
      },
      { status: 400 }
    );
  }

  const result = await deleteManagedAsset({
    actorEmail: authorization.email,
    payload
  });

  if (result.success) {
    return NextResponse.json<{
      success: true;
      message: string;
      data: DeleteImageResult;
    }>({
      success: true,
      message: "Asset deleted successfully",
      data: result.data
    });
  }

  return NextResponse.json(
    {
      success: false,
      message: result.message
    },
    { status: result.status }
  );
}
