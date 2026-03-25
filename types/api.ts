import type { UploadedAsset } from "@/types/asset";

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiFailure = {
  success: false;
  message: string;
  details?: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type DeleteImageRequest = {
  publicId: string;
  resourceType?: "image" | "video" | "raw";
  invalidate?: boolean;
  secureUrl?: string;
};

export type DeleteImageResult = {
  publicId: string;
  result: string;
};

export type BatchDeleteImagesRequest = {
  items: DeleteImageRequest[];
};

export type BatchDeleteImagesResult = {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<
    | {
        success: true;
        data: DeleteImageResult;
      }
    | {
        success: false;
        status: number;
        message: string;
        publicId: string;
      }
  >;
};

export type AdminAssetsResult = {
  assets: UploadedAsset[];
  nextCursor?: string;
};

export type SignedUploadParamsResult = {
  apiKey: string;
  timestamp: number;
  signature: string;
  folder?: string;
  tags?: string;
};

export type DeleteAuditEntry = {
  id: string;
  actorEmail: string;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  secureUrl?: string;
  action: "delete";
  status: "success" | "failed" | "cancelled";
  message: string;
  createdAt: string;
};

export type AdminAuditResult = {
  entries: DeleteAuditEntry[];
};

export type AdminSessionResult = {
  email: string;
  expiresAt: string;
};
