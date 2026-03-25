"use client";

import { useEffect, useMemo, useState } from "react";

import { AssetResultCard } from "@/components/result/asset-result-card";
import { getUnsignedUploadEndpoint } from "@/lib/cloudinary";
import { buildAssetLinks, formatBytes, toUploadedAsset } from "@/lib/formatters";
import { loadRecentUploads, saveRecentUploads } from "@/lib/recent-uploads";
import type { ApiResponse, SignedUploadParamsResult } from "@/types/api";
import type { CloudinaryUploadResult, UploadedAsset } from "@/types/asset";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type UploadState = "idle" | "uploading" | "success" | "error";

type UploadWorkbenchProps = {
  signedUploadAvailable: boolean;
  allowUnsignedFallback: boolean;
};

export function UploadWorkbench({ signedUploadAvailable, allowUnsignedFallback }: UploadWorkbenchProps) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
  const uploadFolder = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER || "cloudnest/uploads";
  const defaultTags = process.env.NEXT_PUBLIC_DEFAULT_UPLOAD_TAGS || "imagebed,mvp,web-upload";

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("拖拽或选择一张图片后即可开始上传。");
  const [latestAsset, setLatestAsset] = useState<UploadedAsset | null>(null);
  const [recentAssets, setRecentAssets] = useState<UploadedAsset[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [lastUploadMode, setLastUploadMode] = useState<"signed" | "unsigned" | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setRecentAssets(loadRecentUploads());
      setHasHydrated(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    saveRecentUploads(recentAssets);
  }, [hasHydrated, recentAssets]);

  const isConfigured = useMemo(
    () => Boolean(cloudName && (signedUploadAvailable || (allowUnsignedFallback && uploadPreset))),
    [allowUnsignedFallback, cloudName, signedUploadAvailable, uploadPreset]
  );

  function handleFileChange(file: File | null) {
    setSelectedFile(file);
    setProgress(0);
    setLatestAsset(null);

    if (!file) {
      setUploadState("idle");
      setMessage("拖拽或选择一张图片后即可开始上传。");
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setUploadState("error");
      setMessage(validationError);
      return;
    }

    setUploadState("idle");
    setMessage(`已选择 ${file.name}，点击上传开始执行 Cloudinary 直传。`);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setUploadState("error");
      setMessage("请先选择图片。");
      return;
    }

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setUploadState("error");
      setMessage(validationError);
      return;
    }

    if (!isConfigured) {
      setUploadState("error");
      setMessage("缺少 Cloudinary 公共环境变量，请先配置 cloud name 和 upload preset。");
      return;
    }

    setUploadState("uploading");
    setProgress(0);
    setMessage("正在上传到 Cloudinary...");

    try {
      const result = await uploadFile({
        file: selectedFile,
        cloudName,
        uploadPreset,
        uploadFolder,
        defaultTags,
        preferSigned: signedUploadAvailable,
        allowUnsignedFallback,
        onProgress: setProgress
      });
      const asset = result.asset;

      setLatestAsset(asset);
      setRecentAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)].slice(0, 6));
      setUploadState("success");
      setLastUploadMode(result.mode);
      setMessage(
        result.mode === "signed"
          ? "上传完成，当前使用的是 signed upload。"
          : "上传完成，当前使用的是 unsigned upload。"
      );
    } catch (error) {
      setUploadState("error");
      setMessage(error instanceof Error ? error.message : "上传失败，请稍后重试。");
    }
  }

  return (
    <div className="stack-lg">
      <section className="hero-card">
        <div className="stack-md">
          <p className="eyebrow">MVP Upload Surface</p>
          <h1>把 Cloudinary 图床先跑起来</h1>
          <p className="hero-copy">
            这套骨架已经接好了 Cloudinary unsigned upload 的浏览器直传路径，管理员删除接口也已留在服务端。
          </p>
        </div>

        <div className="upload-grid">
          <label className="dropzone" htmlFor="asset-file">
            <input
              id="asset-file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              type="file"
              onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
            />
            <span className="dropzone-title">点击选择图片</span>
            <span className="dropzone-copy">支持 JPG、PNG、WEBP、GIF，单文件建议不超过 10 MB。</span>
            {selectedFile ? (
              <span className="dropzone-file">
                已选择 {selectedFile.name} · {formatBytes(selectedFile.size)}
              </span>
            ) : null}
          </label>

          <div className="card stack-md">
            <div className="card-header">
              <div>
                <p className="eyebrow">状态</p>
                <h2>上传控制台</h2>
              </div>
              <span className={`status-chip ${isConfigured ? "status-live" : "status-muted"}`}>
                {isConfigured
                  ? signedUploadAvailable
                    ? "Signed Ready"
                    : "Unsigned Ready"
                  : "Env Missing"}
              </span>
            </div>

            <p className="status-message">{message}</p>

            <p className="help-text">
              当前上传策略：
              {signedUploadAvailable
                ? "优先 signed upload。"
                : allowUnsignedFallback
                  ? "使用 unsigned upload preset。"
                  : "unsigned fallback 已关闭。"}
              {lastUploadMode ? ` 最近一次成功上传走的是 ${lastUploadMode} 模式。` : ""}
            </p>

            <div className="progress-shell" aria-hidden="true">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>

            <button
              className="primary-button"
              type="button"
              disabled={uploadState === "uploading" || !selectedFile}
              onClick={handleUpload}
            >
              {uploadState === "uploading" ? `上传中 ${progress}%` : "上传到 Cloudinary"}
            </button>

            {!isConfigured ? (
              <p className="help-text">
                当前页面不会上传，直到你配置 `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`，并至少满足以下其中一种条件：
                启用服务端签名上传，或在允许 unsigned fallback 的前提下配置 `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`。
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {latestAsset ? (
        <AssetResultCard asset={latestAsset} />
      ) : (
        <section className="card empty-panel">
          <p className="eyebrow">结果面板</p>
          <h2>等待首张图片</h2>
          <p>上传成功后，这里会展示预览、Public ID，以及原图 / Markdown / HTML 三种可复制链接。</p>
        </section>
      )}

      <section className="card stack-md">
        <div className="card-header">
          <div>
            <p className="eyebrow">Recent</p>
            <h2>最近上传</h2>
          </div>
        </div>

        {recentAssets.length === 0 ? (
          <p className="help-text">当前浏览器还没有最近上传记录。</p>
        ) : (
          <ul className="recent-list">
            {recentAssets.map((asset) => {
              const links = buildAssetLinks(asset);

              return (
                <li key={asset.id} className="recent-item">
                  <div>
                    <strong>{asset.fileName}</strong>
                    <p className="help-text">{asset.publicId}</p>
                  </div>
                  <div className="recent-actions">
                    <a className="text-link" href={asset.secureUrl} rel="noreferrer" target="_blank">
                      打开原图
                    </a>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => navigator.clipboard.writeText(links.markdown)}
                    >
                      复制 Markdown
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

type UploadFileInput = {
  file: File;
  cloudName: string;
  uploadPreset: string;
  uploadFolder: string;
  defaultTags: string;
  preferSigned: boolean;
  allowUnsignedFallback: boolean;
  onProgress: (progress: number) => void;
};

async function uploadFile(input: UploadFileInput): Promise<{
  asset: UploadedAsset;
  mode: "signed" | "unsigned";
}> {
  if (input.preferSigned) {
    try {
      const signedParams = await requestSignedUploadParams();
      const signedAsset = await uploadViaSignedRequest(input, signedParams);

      return {
        asset: signedAsset,
        mode: "signed"
      };
    } catch (error) {
      if (!input.uploadPreset) {
        throw error;
      }
    }
  }

  if (!input.allowUnsignedFallback) {
    throw new Error("当前环境已关闭 unsigned fallback，请先启用 signed upload。");
  }

  if (!input.uploadPreset) {
    throw new Error("缺少 unsigned upload preset，且 signed upload 也不可用。");
  }

  const unsignedAsset = await uploadViaUnsignedRequest(input);

  return {
    asset: unsignedAsset,
    mode: "unsigned"
  };
}

function uploadViaUnsignedRequest(input: UploadFileInput): Promise<UploadedAsset> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("file", input.file);
    formData.append("upload_preset", input.uploadPreset);
    formData.append("folder", input.uploadFolder);
    formData.append("tags", input.defaultTags);

    request.open("POST", getUnsignedUploadEndpoint(input.cloudName));
    request.responseType = "json";

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      input.onProgress(Math.round((event.loaded / event.total) * 100));
    };

    request.onerror = () => {
      reject(new Error("网络请求失败，无法连接 Cloudinary。"));
    };

    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        const errorMessage =
          (request.response as { error?: { message?: string } } | null)?.error?.message ||
          "Cloudinary 上传失败。";
        reject(new Error(errorMessage));
        return;
      }

      const response = request.response as CloudinaryUploadResult;
      input.onProgress(100);
      resolve(toUploadedAsset(response));
    };

    request.send(formData);
  });
}

function uploadViaSignedRequest(
  input: UploadFileInput,
  signedParams: SignedUploadParamsResult
): Promise<UploadedAsset> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("file", input.file);
    formData.append("api_key", signedParams.apiKey);
    formData.append("timestamp", String(signedParams.timestamp));
    formData.append("signature", signedParams.signature);

    if (signedParams.folder) {
      formData.append("folder", signedParams.folder);
    }

    if (signedParams.tags) {
      formData.append("tags", signedParams.tags);
    }

    request.open("POST", getUnsignedUploadEndpoint(input.cloudName));
    request.responseType = "json";

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      input.onProgress(Math.round((event.loaded / event.total) * 100));
    };

    request.onerror = () => {
      reject(new Error("网络请求失败，无法连接 Cloudinary。"));
    };

    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        const errorMessage =
          (request.response as { error?: { message?: string } } | null)?.error?.message ||
          "Cloudinary signed upload 失败。";
        reject(new Error(errorMessage));
        return;
      }

      const response = request.response as CloudinaryUploadResult;
      input.onProgress(100);
      resolve(toUploadedAsset(response));
    };

    request.send(formData);
  });
}

async function requestSignedUploadParams(): Promise<SignedUploadParamsResult> {
  const response = await fetch("/api/sign-cloudinary-params", {
    method: "POST"
  });

  const result = (await response.json()) as ApiResponse<SignedUploadParamsResult>;

  if (!response.ok || !result.success) {
    throw new Error(result.message || "获取签名上传参数失败。");
  }

  return result.data;
}

function validateFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "只允许上传图片文件。";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "当前骨架默认限制单文件 10 MB。";
  }

  return null;
}
