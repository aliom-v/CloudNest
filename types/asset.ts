export type ResourceType = "image" | "video" | "raw";

export type UploadedAsset = {
  id: string;
  publicId: string;
  secureUrl: string;
  thumbnailUrl: string;
  fileName: string;
  bytes: number;
  width?: number;
  height?: number;
  format?: string;
  resourceType: ResourceType;
  deliveryType?: string;
  tags?: string[];
  createdAt: string;
};

export type AssetLinkBundle = {
  direct: string;
  markdown: string;
  html: string;
};

export type CloudinaryUploadResult = {
  asset_id: string;
  public_id: string;
  secure_url: string;
  original_filename: string;
  bytes: number;
  width?: number;
  height?: number;
  format?: string;
  resource_type: ResourceType;
  created_at: string;
};

export type CloudinaryAdminResource = {
  asset_id: string;
  public_id: string;
  secure_url: string;
  bytes: number;
  width?: number;
  height?: number;
  format?: string;
  resource_type: ResourceType;
  type?: string;
  tags?: string[];
  created_at: string;
};
