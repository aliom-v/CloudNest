import type { AssetLinkBundle, CloudinaryUploadResult, UploadedAsset } from "@/types/asset";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDimensions(width?: number, height?: number): string {
  if (!width || !height) {
    return "尺寸待定";
  }

  return `${width} × ${height}`;
}

export function buildAssetLinks(asset: UploadedAsset): AssetLinkBundle {
  return {
    direct: asset.secureUrl,
    markdown: `![${asset.fileName}](${asset.secureUrl})`,
    html: `<img src="${asset.secureUrl}" alt="${escapeHtml(asset.fileName)}" />`
  };
}

export function toUploadedAsset(result: CloudinaryUploadResult): UploadedAsset {
  const fileStem = result.original_filename || result.public_id.split("/").pop() || "uploaded-asset";

  return {
    id: result.asset_id,
    publicId: result.public_id,
    secureUrl: result.secure_url,
    thumbnailUrl: result.secure_url,
    fileName: result.format ? `${fileStem}.${result.format}` : fileStem,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
    format: result.format,
    resourceType: result.resource_type,
    createdAt: result.created_at
  };
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
