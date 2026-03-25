import { createHash } from "node:crypto";

import { buildCloudinarySearchExpression } from "@/lib/cloudinary-search-policy";
import type { CloudinaryAdminResource, ResourceType, UploadedAsset } from "@/types/asset";

type DeleteAssetInput = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  publicId: string;
  resourceType: ResourceType;
  invalidate: boolean;
};

type DeleteAssetOutput = {
  result: string;
};

type SignedUploadParams = {
  apiKey: string;
  timestamp: number;
  signature: string;
  folder?: string;
  tags?: string;
};

type ListAssetsInput = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  prefix?: string;
  maxResults: number;
  nextCursor?: string;
};

type ListAssetsOutput = {
  assets: UploadedAsset[];
  nextCursor?: string;
};

type SearchAssetsInput = ListAssetsInput & {
  query: string;
};

export function getUnsignedUploadEndpoint(cloudName: string): string {
  return `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
}

export function buildSignedUploadParams(input: {
  apiKey: string;
  apiSecret: string;
  folder?: string;
  tags?: string;
}): SignedUploadParams {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = createCloudinarySignature({
    folder: input.folder,
    tags: input.tags,
    timestamp
  }, input.apiSecret);

  return {
    apiKey: input.apiKey,
    timestamp,
    signature: paramsToSign,
    folder: input.folder,
    tags: input.tags
  };
}

export async function listCloudinaryAssets(input: ListAssetsInput): Promise<ListAssetsOutput> {
  const params = new URLSearchParams({
    max_results: String(input.maxResults),
    fields: "secure_url,bytes,width,height,format,resource_type,type,tags,created_at"
  });

  if (input.prefix) {
    params.set("prefix", input.prefix);
  }

  if (input.nextCursor) {
    params.set("next_cursor", input.nextCursor);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${input.cloudName}/resources/image/upload?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: buildCloudinaryBasicAuthHeader(input.apiKey, input.apiSecret)
      },
      cache: "no-store"
    }
  );

  const data = (await response.json()) as {
    resources?: CloudinaryAdminResource[];
    next_cursor?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message || "Cloudinary asset list request failed.");
  }

  const assets = (data.resources || [])
    .map(toUploadedAssetFromAdminResource)
    .sort((left, right) => {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

  return {
    assets,
    nextCursor: data.next_cursor
  };
}

export async function searchCloudinaryAssets(input: SearchAssetsInput): Promise<ListAssetsOutput> {
  const params = new URLSearchParams({
    expression: buildCloudinarySearchExpression({
      uploadFolder: input.prefix,
      query: input.query
    }),
    max_results: String(input.maxResults),
    fields: "secure_url,bytes,width,height,format,resource_type,type,tags,created_at"
  });

  if (input.nextCursor) {
    params.set("next_cursor", input.nextCursor);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${input.cloudName}/resources/search?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: buildCloudinaryBasicAuthHeader(input.apiKey, input.apiSecret)
      },
      cache: "no-store"
    }
  );

  const data = (await response.json()) as {
    resources?: CloudinaryAdminResource[];
    next_cursor?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message || "Cloudinary asset search request failed.");
  }

  return {
    assets: (data.resources || []).map(toUploadedAssetFromAdminResource),
    nextCursor: data.next_cursor
  };
}

export async function deleteCloudinaryAsset(input: DeleteAssetInput): Promise<DeleteAssetOutput> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createCloudinarySignature(
    {
      invalidate: input.invalidate,
      public_id: input.publicId,
      timestamp
    },
    input.apiSecret
  );

  const body = new URLSearchParams({
    public_id: input.publicId,
    invalidate: String(input.invalidate),
    api_key: input.apiKey,
    timestamp: String(timestamp),
    signature
  });

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${input.cloudName}/${input.resourceType}/destroy`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body,
      cache: "no-store"
    }
  );

  const data = (await response.json()) as { result?: string; error?: { message?: string } };

  if (!response.ok) {
    throw new Error(data.error?.message || "Cloudinary delete request failed.");
  }

  return {
    result: data.result || "unknown"
  };
}

function buildCloudinaryBasicAuthHeader(apiKey: string, apiSecret: string): string {
  const token = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  return `Basic ${token}`;
}

function createCloudinarySignature(
  params: Record<string, boolean | number | string | undefined>,
  apiSecret: string
): string {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");

  return createHash("sha1")
    .update(`${serialized}${apiSecret}`)
    .digest("hex");
}

function toUploadedAssetFromAdminResource(resource: CloudinaryAdminResource): UploadedAsset {
  const fileStem = resource.public_id.split("/").pop() || resource.public_id;

  return {
    id: resource.asset_id,
    publicId: resource.public_id,
    secureUrl: resource.secure_url,
    thumbnailUrl: resource.secure_url,
    fileName: resource.format ? `${fileStem}.${resource.format}` : fileStem,
    bytes: resource.bytes,
    width: resource.width,
    height: resource.height,
    format: resource.format,
    resourceType: resource.resource_type,
    deliveryType: resource.type,
    tags: resource.tags,
    createdAt: resource.created_at
  };
}
