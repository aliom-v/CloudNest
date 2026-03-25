import { isPublicSignedUploadEnabled as isPublicSignedUploadEnabledByPolicy, normalizeUploadFolder } from "@/lib/upload-policy";

type EnvFlag = {
  key: string;
  required: boolean;
  value?: string;
  ready: boolean;
};

export function getSiteName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME || "CloudNest";
}

export function getPublicUploadConfig() {
  const uploadFolder = normalizeUploadFolder(process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER || "cloudnest/uploads");

  return {
    siteName: getSiteName(),
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "",
    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "",
    uploadFolder: uploadFolder || "cloudnest/uploads",
    defaultTags: process.env.NEXT_PUBLIC_DEFAULT_UPLOAD_TAGS || "imagebed,mvp,web-upload"
  };
}

export function getServerCloudinaryConfig() {
  return {
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    uploadFolder: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER || "cloudnest/uploads"
  };
}

export function getPublicEnvFlags(): EnvFlag[] {
  const config = getPublicUploadConfig();

  return [
    toFlag("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", config.cloudName, true),
    toFlag("NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET", config.uploadPreset, true),
    toFlag("NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER", config.uploadFolder, false),
    toFlag("NEXT_PUBLIC_DEFAULT_UPLOAD_TAGS", config.defaultTags, false),
    toFlag("ALLOW_PUBLIC_SIGNED_UPLOAD", process.env.ALLOW_PUBLIC_SIGNED_UPLOAD, false)
  ];
}

export function getServerEnvFlags(): EnvFlag[] {
  return [
    toFlag("CLOUDINARY_API_KEY", process.env.CLOUDINARY_API_KEY, true),
    toFlag("CLOUDINARY_API_SECRET", process.env.CLOUDINARY_API_SECRET, true),
    toFlag("AUTH_ALLOWED_EMAILS", process.env.AUTH_ALLOWED_EMAILS, true),
    toFlag("ADMIN_LOGIN_PASSWORD", process.env.ADMIN_LOGIN_PASSWORD, true),
    toFlag("ADMIN_SESSION_SECRET", process.env.ADMIN_SESSION_SECRET, true),
    toFlag("BLOB_READ_WRITE_TOKEN", process.env.BLOB_READ_WRITE_TOKEN, false)
  ];
}

export function hasServerDeleteConfig(): boolean {
  return getServerEnvFlags().every((flag) => !flag.required || flag.ready);
}

export function hasServerUploadSigningConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export function isPublicSignedUploadEnabled(): boolean {
  return isPublicSignedUploadEnabledByPolicy(
    hasServerUploadSigningConfig(),
    process.env.ALLOW_PUBLIC_SIGNED_UPLOAD
  );
}

export function getAdminAuthConfig() {
  return {
    loginPassword: process.env.ADMIN_LOGIN_PASSWORD || "",
    sessionSecret: process.env.ADMIN_SESSION_SECRET || "",
    sessionTtlHours: Number(process.env.ADMIN_SESSION_TTL_HOURS || "24")
  };
}

export function hasAdminAuthConfig(): boolean {
  const config = getAdminAuthConfig();

  return Boolean(config.loginPassword && config.sessionSecret);
}

export function allowUnsignedUploadFallback(): boolean {
  return process.env.ALLOW_UNSIGNED_UPLOAD_FALLBACK !== "false";
}

function toFlag(key: string, value: string | undefined, required: boolean): EnvFlag {
  return {
    key,
    required,
    value,
    ready: Boolean(value && value.trim().length > 0)
  };
}
