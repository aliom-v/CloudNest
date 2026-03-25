export function normalizeUploadFolder(input: string | undefined): string {
  return (input || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
}

export function normalizePublicId(input: string): string {
  return input
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
}

export function isPublicIdWithinUploadFolder(publicId: string, uploadFolder: string): boolean {
  const normalizedFolder = normalizeUploadFolder(uploadFolder);
  const normalizedPublicId = normalizePublicId(publicId);

  if (!normalizedFolder) {
    return true;
  }

  return normalizedPublicId === normalizedFolder || normalizedPublicId.startsWith(`${normalizedFolder}/`);
}

export function isPublicSignedUploadEnabled(
  hasServerSigningConfig: boolean,
  allowPublicSignedUpload: string | undefined
): boolean {
  return hasServerSigningConfig && allowPublicSignedUpload === "true";
}

export function isSameOriginRequest(origin: string | null, host: string | null): boolean {
  if (!origin || !host) {
    return false;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
