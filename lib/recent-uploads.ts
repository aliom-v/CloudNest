import type { UploadedAsset } from "@/types/asset";

export const RECENT_UPLOADS_STORAGE_KEY = "cloudnest.recent-uploads";

export function loadRecentUploads(): UploadedAsset[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(RECENT_UPLOADS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as UploadedAsset[];
  } catch {
    window.localStorage.removeItem(RECENT_UPLOADS_STORAGE_KEY);
    return [];
  }
}

export function saveRecentUploads(assets: UploadedAsset[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(RECENT_UPLOADS_STORAGE_KEY, JSON.stringify(assets.slice(0, 6)));
}
