"use client";

import { useEffect, useMemo, useState } from "react";

import { loadRecentUploads, saveRecentUploads } from "@/lib/recent-uploads";
import type {
  ApiResponse,
  BatchDeleteImagesResult,
  DeleteImageRequest,
  DeleteImageResult
} from "@/types/api";
import type { UploadedAsset } from "@/types/asset";
import { AssetList } from "./asset-list";
import { AuditLog } from "./audit-log";

type DeleteConsoleProps = {
  authenticatedEmail: string | null;
  deleteRouteReady: boolean;
};

type DeleteState = "idle" | "submitting" | "success" | "error";

export function DeleteConsole({ authenticatedEmail, deleteRouteReady }: DeleteConsoleProps) {
  const [publicId, setPublicId] = useState("");
  const [resourceType, setResourceType] = useState<DeleteImageRequest["resourceType"]>("image");
  const [invalidate, setInvalidate] = useState(true);
  const [requestState, setRequestState] = useState<DeleteState>("idle");
  const [feedback, setFeedback] = useState("登录后即可测试删除链路。");
  const [recentAssets, setRecentAssets] = useState<UploadedAsset[]>([]);
  const [selectedPublicIds, setSelectedPublicIds] = useState<string[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setRecentAssets(loadRecentUploads());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const canSubmit = useMemo(
    () => Boolean(deleteRouteReady && authenticatedEmail && publicId.trim()),
    [authenticatedEmail, deleteRouteReady, publicId]
  );

  const selectedCount = selectedPublicIds.length;

  function applyAsset(asset: UploadedAsset) {
    setPublicId(asset.publicId);
    setResourceType(asset.resourceType);
    setFeedback(`已载入 ${asset.fileName}，可以直接尝试删除。`);
    setRequestState("idle");
  }

  async function runDelete(payload: DeleteImageRequest, asset?: UploadedAsset) {
    if (!deleteRouteReady || !authenticatedEmail || !payload.publicId.trim()) {
      setRequestState("error");
      setFeedback("删除条件还不完整，请检查登录态、public_id 和服务端环境变量。");
      return;
    }

    const targetPublicId = payload.publicId.trim();
    const confirmed = window.confirm(`确认删除资源 ${targetPublicId} 吗？此操作会调用 Cloudinary 删除接口。`);
    if (!confirmed) {
      setRequestState("idle");
      setFeedback("已取消删除。");
      return;
    }

    setRequestState("submitting");
    setFeedback("正在请求服务端删除 Cloudinary 资源...");

    try {
      const response = await fetch("/api/delete-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          secureUrl: payload.secureUrl || asset?.secureUrl
        })
      });

      const result = (await response.json()) as ApiResponse<DeleteImageResult>;

      if (!response.ok || !result.success) {
        setRequestState("error");
        setFeedback(result.message || "删除失败。");
        return;
      }

      const nextRecentAssets = recentAssets.filter((item) => item.publicId !== targetPublicId);
      setRecentAssets(nextRecentAssets);
      saveRecentUploads(nextRecentAssets);
      setSelectedPublicIds((current) => current.filter((item) => item !== targetPublicId));
      setRequestState("success");
      setFeedback(
        `删除成功：${result.data.publicId} (${result.data.result})${asset ? `，资源 ${asset.fileName} 已从列表移除。` : "。"}`
      );
    } catch (error) {
      setRequestState("error");
      setFeedback(error instanceof Error ? error.message : "删除请求失败。");
    }
  }

  async function handleDelete() {
    await runDelete({
      publicId: publicId.trim(),
      resourceType: resourceType || "image",
      invalidate
    });
  }

  async function handleBatchDelete() {
    if (!authenticatedEmail || selectedCount === 0) {
      setRequestState("error");
      setFeedback("请先选择至少一个资源。");
      return;
    }

    const confirmed = window.confirm(`确认批量删除 ${selectedCount} 个资源吗？此操作不可撤销。`);
    if (!confirmed) {
      setRequestState("idle");
      setFeedback("已取消批量删除。");
      return;
    }

    setRequestState("submitting");
    setFeedback(`正在批量删除 ${selectedCount} 个资源...`);

    try {
      const response = await fetch("/api/delete-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selectedPublicIds.map((id) => ({
            publicId: id,
            resourceType: "image",
            invalidate
          }))
        })
      });

      const result = (await response.json()) as ApiResponse<BatchDeleteImagesResult>;

      if (!response.ok || !result.success) {
        setRequestState("error");
        setFeedback(result.message || "批量删除失败。");
        return;
      }

      const succeededIds = result.data.results
        .filter((item) => item.success)
        .map((item) => item.data.publicId);

      setRecentAssets((current) => {
        const next = current.filter((asset) => !succeededIds.includes(asset.publicId));
        saveRecentUploads(next);
        return next;
      });
      setSelectedPublicIds([]);
      setRequestState(result.data.failed > 0 ? "error" : "success");
      setFeedback(`批量删除完成：成功 ${result.data.succeeded} 个，失败 ${result.data.failed} 个。`);
    } catch (error) {
      setRequestState("error");
      setFeedback(error instanceof Error ? error.message : "批量删除请求失败。");
    }
  }

  function toggleSelectedId(id: string) {
    setSelectedPublicIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  return (
    <section className="card stack-md">
      <div className="card-header">
        <div>
          <p className="eyebrow">Delete Flow</p>
          <h2>管理员删除联调台</h2>
        </div>
        <span
          className={`status-chip ${
            requestState === "success"
              ? "status-live"
              : requestState === "error"
                ? "status-danger"
                : "status-muted"
          }`}
        >
          {requestState === "success" ? "Delete Succeeded" : requestState === "error" ? "Delete Failed" : "Awaiting Input"}
        </span>
      </div>

      <p className="status-message">
        当前删除请求依赖 HTTP-only 管理员会话 cookie，并由服务端按 `AUTH_ALLOWED_EMAILS` 白名单校验。
      </p>

      <div className="form-grid">
        <label className="field">
          <span>资源类型</span>
          <select
            className="text-input"
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value as DeleteImageRequest["resourceType"])}
          >
            <option value="image">image</option>
            <option value="video">video</option>
            <option value="raw">raw</option>
          </select>
        </label>

        <label className="field">
          <span>Public ID</span>
          <input
            className="text-input"
            placeholder="cloudnest/uploads/xxx_demo"
            type="text"
            value={publicId}
            onChange={(e) => setPublicId(e.target.value)}
          />
        </label>
      </div>

      <label className="checkbox-row">
        <input checked={invalidate} type="checkbox" onChange={(e) => setInvalidate(e.target.checked)} />
        <span>删除后同时请求 CDN 失效</span>
      </label>

      <div className="inline-actions">
        <button className="primary-button" disabled={!canSubmit || requestState === "submitting"} onClick={handleDelete} type="button">
          {requestState === "submitting" ? "删除中..." : "调用删除接口"}
        </button>

        <button
          className="ghost-button"
          type="button"
          onClick={() => {
            const first = recentAssets[0];
            if (first) applyAsset(first);
          }}
          disabled={recentAssets.length === 0}
        >
          载入最近一张
        </button>

        <button
          className="ghost-button"
          type="button"
          disabled={!authenticatedEmail || selectedCount === 0 || requestState === "submitting"}
          onClick={handleBatchDelete}
        >
          {requestState === "submitting" ? "批量删除中..." : `批量删除所选 (${selectedCount})`}
        </button>
      </div>

      <p className="help-text">{feedback}</p>
      <p className="help-text">
        {authenticatedEmail ? `当前登录管理员：${authenticatedEmail}` : "当前未登录管理员会话，删除和后台资源读取已禁用。"}
      </p>

      <div className="stack-sm">
        <div className="card-subtitle-row">
          <strong>最近上传的可选资源</strong>
          <span className="help-text">从首页上传后，这里会自动读取浏览器本地最近记录。</span>
        </div>

        {recentAssets.length === 0 ? (
          <p className="help-text">还没有最近上传记录，先去首页上传一张图片会更方便联调删除。</p>
        ) : (
          <ul className="recent-list">
            {recentAssets.map((asset) => (
              <li key={asset.id} className="recent-item">
                <div className="stack-sm compact-stack">
                  <strong>{asset.fileName}</strong>
                  <p className="help-text">{asset.publicId}</p>
                </div>
                <div className="recent-actions">
                  <button className="ghost-button" type="button" onClick={() => applyAsset(asset)}>
                    用这个 Public ID
                  </button>
                  <a className="text-link" href={asset.secureUrl} rel="noreferrer" target="_blank">
                    查看原图
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AssetList
        authenticatedEmail={authenticatedEmail}
        selectedPublicIds={selectedPublicIds}
        onSelectToggle={toggleSelectedId}
        onApplyAsset={applyAsset}
        onDirectDelete={(asset) =>
          runDelete(
            {
              publicId: asset.publicId,
              resourceType: asset.resourceType,
              invalidate,
              secureUrl: asset.secureUrl
            },
            asset
          )
        }
        onSelectAll={(assets) => setSelectedPublicIds(assets.map((a) => a.publicId))}
        onClearSelection={() => setSelectedPublicIds([])}
        invalidate={invalidate}
      />

      <AuditLog authenticatedEmail={authenticatedEmail} />
    </section>
  );
}
