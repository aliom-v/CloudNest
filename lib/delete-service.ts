import { appendDeleteAuditEntry } from "@/lib/delete-audit";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";
import { getPublicUploadConfig, getServerCloudinaryConfig } from "@/lib/env";
import { isPublicIdWithinUploadFolder } from "@/lib/upload-policy";
import type {
  DeleteAuditEntry,
  DeleteImageRequest,
  DeleteImageResult
} from "@/types/api";

export async function deleteManagedAsset(input: {
  actorEmail: string;
  payload: DeleteImageRequest;
}): Promise<
  | {
      success: true;
      data: DeleteImageResult;
    }
  | {
      success: false;
      status: number;
      message: string;
    }
> {
  const payload = input.payload;

  if (!payload.publicId) {
    await logDeleteAudit({
      actorEmail: input.actorEmail,
      publicId: "",
      resourceType: payload.resourceType || "image",
      secureUrl: payload.secureUrl,
      status: "failed",
      message: "publicId 不能为空。"
    });

    return {
      success: false,
      status: 400,
      message: "publicId 不能为空。"
    };
  }

  const { cloudName, uploadFolder } = getPublicUploadConfig();
  const { apiKey, apiSecret } = getServerCloudinaryConfig();

  if (!cloudName || !apiKey || !apiSecret) {
    await logDeleteAudit({
      actorEmail: input.actorEmail,
      publicId: payload.publicId,
      resourceType: payload.resourceType || "image",
      secureUrl: payload.secureUrl,
      status: "failed",
      message: "Cloudinary 服务端密钥未配置完整。"
    });

    return {
      success: false,
      status: 500,
      message: "Cloudinary 服务端密钥未配置完整。"
    };
  }

  if (!isPublicIdWithinUploadFolder(payload.publicId, uploadFolder)) {
    const message = `只允许删除 ${uploadFolder} 目录内的资源。`;

    await logDeleteAudit({
      actorEmail: input.actorEmail,
      publicId: payload.publicId,
      resourceType: payload.resourceType || "image",
      secureUrl: payload.secureUrl,
      status: "failed",
      message
    });

    return {
      success: false,
      status: 400,
      message
    };
  }

  try {
    const result = await deleteCloudinaryAsset({
      cloudName,
      apiKey,
      apiSecret,
      publicId: payload.publicId,
      resourceType: payload.resourceType || "image",
      invalidate: payload.invalidate ?? true
    });

    await logDeleteAudit({
      actorEmail: input.actorEmail,
      publicId: payload.publicId,
      resourceType: payload.resourceType || "image",
      secureUrl: payload.secureUrl,
      status: "success",
      message: `Cloudinary 返回结果：${result.result}`
    });

    return {
      success: true,
      data: {
        publicId: payload.publicId,
        result: result.result
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除 Cloudinary 资源失败。";

    await logDeleteAudit({
      actorEmail: input.actorEmail,
      publicId: payload.publicId,
      resourceType: payload.resourceType || "image",
      secureUrl: payload.secureUrl,
      status: "failed",
      message
    });

    return {
      success: false,
      status: 502,
      message
    };
  }
}

async function logDeleteAudit(input: Omit<DeleteAuditEntry, "action" | "createdAt" | "id">) {
  await appendDeleteAuditEntry({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action: "delete",
    createdAt: new Date().toISOString(),
    ...input
  });
}
