"use client";

import { useEffect, useMemo, useState } from "react";

import { formatBytes } from "@/lib/formatters";
import { loadRecentUploads, saveRecentUploads } from "@/lib/recent-uploads";
import type {
  AdminAssetsResult,
  AdminAuditResult,
  ApiResponse,
  BatchDeleteImagesResult,
  DeleteImageRequest,
  DeleteImageResult
} from "@/types/api";
import type { UploadedAsset } from "@/types/asset";

type DeleteConsoleProps = {
  authenticatedEmail: string | null;
  deleteRouteReady: boolean;
};

type DeleteState = "idle" | "submitting" | "success" | "error";
type AssetLoadState = "idle" | "loading" | "ready" | "error";

export function DeleteConsole({ authenticatedEmail, deleteRouteReady }: DeleteConsoleProps) {
  const [publicId, setPublicId] = useState("");
  const [resourceType, setResourceType] = useState<DeleteImageRequest["resourceType"]>("image");
  const [invalidate, setInvalidate] = useState(true);
  const [requestState, setRequestState] = useState<DeleteState>("idle");
  const [feedback, setFeedback] = useState("登录后即可测试删除链路。");
  const [recentAssets, setRecentAssets] = useState<UploadedAsset[]>([]);
  const [cloudinaryAssets, setCloudinaryAssets] = useState<UploadedAsset[]>([]);
  const [assetLoadState, setAssetLoadState] = useState<AssetLoadState>("idle");
  const [assetFeedback, setAssetFeedback] = useState("登录后可读取 Cloudinary 中当前目录下的真实资源。");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [assetQuery, setAssetQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [pageSize, setPageSize] = useState("24");
  const [selectedPublicIds, setSelectedPublicIds] = useState<string[]>([]);
  const [auditEntries, setAuditEntries] = useState<AdminAuditResult["entries"]>([]);
  const [auditQuery, setAuditQuery] = useState("");
  const [auditStatus, setAuditStatus] = useState("all");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setRecentAssets(loadRecentUploads());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!authenticatedEmail) {
        setAuditEntries([]);
        return;
      }

      void (async () => {
        const entries = await fetchAuditEntriesFromApi(auditQuery, auditStatus);
        if (entries) {
          setAuditEntries(entries);
        }
      })();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [auditQuery, auditStatus, authenticatedEmail]);

  const canSubmit = useMemo(
    () => Boolean(deleteRouteReady && authenticatedEmail && publicId.trim()),
    [authenticatedEmail, deleteRouteReady, publicId]
  );

  const filteredCloudinaryAssets = useMemo(() => {
    return cloudinaryAssets.filter((asset) => {
      const queryMatch = assetQuery.trim()
        ? [asset.fileName, asset.publicId, asset.tags?.join(" "), asset.format]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(assetQuery.trim().toLowerCase())
        : true;

      const formatMatch = formatFilter === "all" ? true : (asset.format || "unknown") === formatFilter;

      return queryMatch && formatMatch;
    });
  }, [assetQuery, cloudinaryAssets, formatFilter]);

  const formatOptions = useMemo(() => {
    return Array.from(new Set(cloudinaryAssets.map((asset) => asset.format || "unknown"))).sort();
  }, [cloudinaryAssets]);

  const selectedCount = useMemo(() => {
    return filteredCloudinaryAssets.filter((asset) => selectedPublicIds.includes(asset.publicId)).length;
  }, [filteredCloudinaryAssets, selectedPublicIds]);

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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...payload,
          secureUrl: payload.secureUrl || asset?.secureUrl
        })
      });

      const result = (await response.json()) as ApiResponse<DeleteImageResult>;

      if (!response.ok || !result.success) {
        setRequestState("error");
        setFeedback(result.message || "删除失败。");
        await refreshAuditEntries();
        return;
      }

      const nextRecentAssets = recentAssets.filter((item) => item.publicId !== targetPublicId);
      setRecentAssets(nextRecentAssets);
      saveRecentUploads(nextRecentAssets);
      setCloudinaryAssets((current) => current.filter((item) => item.publicId !== targetPublicId));
      setSelectedPublicIds((current) => current.filter((item) => item !== targetPublicId));
      setRequestState("success");
      setFeedback(
        `删除成功：${result.data.publicId} (${result.data.result})${asset ? `，资源 ${asset.fileName} 已从列表移除。` : "。"}`
      );
      await refreshAuditEntries();
    } catch (error) {
      setRequestState("error");
      setFeedback(error instanceof Error ? error.message : "删除请求失败。");
      await refreshAuditEntries();
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

    const selectedAssets = filteredCloudinaryAssets.filter((asset) => selectedPublicIds.includes(asset.publicId));
    const confirmed = window.confirm(`确认批量删除 ${selectedAssets.length} 个资源吗？此操作不可撤销。`);
    if (!confirmed) {
      setRequestState("idle");
      setFeedback("已取消批量删除。");
      return;
    }

    setRequestState("submitting");
    setFeedback(`正在批量删除 ${selectedAssets.length} 个资源...`);

    try {
      const response = await fetch("/api/delete-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: selectedAssets.map((asset) => ({
            publicId: asset.publicId,
            resourceType: asset.resourceType,
            invalidate,
            secureUrl: asset.secureUrl
          }))
        })
      });

      const result = (await response.json()) as ApiResponse<BatchDeleteImagesResult>;

      if (!response.ok || !result.success) {
        setRequestState("error");
        setFeedback(result.message || "批量删除失败。");
        await refreshAuditEntries();
        return;
      }

      const succeededPublicIds = result.data.results
        .filter((item) => item.success)
        .map((item) => item.data.publicId);

      setRecentAssets((current) => {
        const nextRecentAssets = current.filter((asset) => !succeededPublicIds.includes(asset.publicId));
        saveRecentUploads(nextRecentAssets);
        return nextRecentAssets;
      });
      setCloudinaryAssets((current) => current.filter((asset) => !succeededPublicIds.includes(asset.publicId)));
      setSelectedPublicIds([]);
      setRequestState(result.data.failed > 0 ? "error" : "success");
      setFeedback(`批量删除完成：成功 ${result.data.succeeded} 个，失败 ${result.data.failed} 个。`);
      await refreshAuditEntries();
    } catch (error) {
      setRequestState("error");
      setFeedback(error instanceof Error ? error.message : "批量删除请求失败。");
      await refreshAuditEntries();
    }
  }

  async function loadCloudinaryAssets(cursor?: string) {
    if (!authenticatedEmail) {
      setAssetLoadState("error");
      setAssetFeedback("请先登录管理员会话。");
      return;
    }

    setAssetLoadState("loading");
    setAssetFeedback(cursor ? "正在加载更多 Cloudinary 资源..." : "正在读取 Cloudinary 资源列表...");

    try {
      const query = new URLSearchParams({
        maxResults: pageSize
      });

      if (assetQuery.trim()) {
        query.set("q", assetQuery.trim());
      }

      if (cursor) {
        query.set("cursor", cursor);
      }

      const response = await fetch(`/api/admin-assets?${query.toString()}`, {
        method: "GET"
      });

      const result = (await response.json()) as ApiResponse<AdminAssetsResult>;

      if (!response.ok || !result.success) {
        setAssetLoadState("error");
        setAssetFeedback(result.message || "读取资源列表失败。");
        return;
      }

      setCloudinaryAssets((current) => {
        const merged = cursor ? [...current, ...result.data.assets] : result.data.assets;
        const deduped = new Map(merged.map((asset) => [asset.id, asset]));
        return Array.from(deduped.values());
      });
      if (!cursor) {
        setSelectedPublicIds([]);
      }
      setNextCursor(result.data.nextCursor || null);
      setAssetLoadState("ready");
      setAssetFeedback(
        result.data.assets.length > 0
          ? `已读取 ${cursor ? "更多" : ""} Cloudinary 资源。`
          : "当前目录下没有可显示的 Cloudinary 资源。"
      );
    } catch (error) {
      setAssetLoadState("error");
      setAssetFeedback(error instanceof Error ? error.message : "读取资源列表失败。");
    }
  }

  async function refreshAuditEntries() {
    const entries = await fetchAuditEntriesFromApi(auditQuery, auditStatus);
    if (entries) {
      setAuditEntries(entries);
    }
  }

  function toggleSelectedPublicId(publicIdToToggle: string) {
    setSelectedPublicIds((current) =>
      current.includes(publicIdToToggle)
        ? current.filter((publicId) => publicId !== publicIdToToggle)
        : [...current, publicIdToToggle]
    );
  }

  function selectAllFilteredAssets() {
    setSelectedPublicIds(filteredCloudinaryAssets.map((asset) => asset.publicId));
  }

  function clearSelectedAssets() {
    setSelectedPublicIds([]);
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
          {requestState === "success"
            ? "Delete Succeeded"
            : requestState === "error"
              ? "Delete Failed"
              : "Awaiting Input"}
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
            onChange={(event) => setResourceType(event.target.value as DeleteImageRequest["resourceType"])}
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
            placeholder="cloudnest/uploads/20260325_xxx_demo"
            type="text"
            value={publicId}
            onChange={(event) => setPublicId(event.target.value)}
          />
        </label>
      </div>

      <label className="checkbox-row">
        <input checked={invalidate} type="checkbox" onChange={(event) => setInvalidate(event.target.checked)} />
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
            const firstAsset = recentAssets[0];
            if (firstAsset) {
              applyAsset(firstAsset);
            }
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

      <div className="stack-sm">
        <div className="card-subtitle-row">
          <strong>Cloudinary 真实资源列表</strong>
          <span className="help-text">通过服务端 Admin API 获取当前上传目录下的资源。</span>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>搜索资源</span>
            <input
              className="text-input"
              placeholder="按文件名、public_id 或标签搜索"
              type="text"
              value={assetQuery}
              onChange={(event) => setAssetQuery(event.target.value)}
            />
          </label>

          <label className="field">
            <span>格式筛选</span>
            <select
              className="text-input"
              value={formatFilter}
              onChange={(event) => setFormatFilter(event.target.value)}
            >
              <option value="all">all</option>
              {formatOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>每页数量</span>
            <select
              className="text-input"
              value={pageSize}
              onChange={(event) => setPageSize(event.target.value)}
            >
              <option value="12">12</option>
              <option value="24">24</option>
              <option value="48">48</option>
            </select>
          </label>

          <label className="field">
            <span>当前勾选</span>
            <input className="text-input" disabled type="text" value={`${selectedCount} 项`} />
          </label>
        </div>

        <div className="inline-actions">
          <button
            className="ghost-button"
            type="button"
            disabled={filteredCloudinaryAssets.length === 0}
            onClick={selectAllFilteredAssets}
          >
            全选当前筛选结果
          </button>

          <button
            className="ghost-button"
            type="button"
            disabled={selectedPublicIds.length === 0}
            onClick={clearSelectedAssets}
          >
            清空选择
          </button>

          <button
            className="ghost-button"
            type="button"
            disabled={!deleteRouteReady || !authenticatedEmail || assetLoadState === "loading"}
            onClick={() => loadCloudinaryAssets()}
          >
            {assetLoadState === "loading" ? "读取中..." : "读取 Cloudinary 资源"}
          </button>

          {nextCursor ? (
            <button
              className="ghost-button"
              type="button"
              disabled={assetLoadState === "loading"}
              onClick={() => loadCloudinaryAssets(nextCursor)}
            >
              读取更多
            </button>
          ) : null}
        </div>

        <p className="help-text">{assetFeedback}</p>

        {cloudinaryAssets.length === 0 ? (
          <p className="help-text">还没有加载到远端资源。配置好服务端环境变量后点击上面的按钮即可读取。</p>
        ) : filteredCloudinaryAssets.length === 0 ? (
          <p className="help-text">当前筛选条件下没有匹配的资源。</p>
        ) : (
          <ul className="recent-list">
            {filteredCloudinaryAssets.map((asset) => (
              <li key={asset.id} className="recent-item">
                <div className="stack-sm compact-stack">
                  <label className="checkbox-row">
                    <input
                      checked={selectedPublicIds.includes(asset.publicId)}
                      type="checkbox"
                      onChange={() => toggleSelectedPublicId(asset.publicId)}
                    />
                    <span>选中</span>
                  </label>
                  <strong>{asset.fileName}</strong>
                  <p className="help-text">{asset.publicId}</p>
                  <p className="help-text">
                    {new Date(asset.createdAt).toLocaleString("zh-CN")} · {formatBytes(asset.bytes)}
                  </p>
                </div>
                <div className="recent-actions">
                  <button className="ghost-button" type="button" onClick={() => applyAsset(asset)}>
                    填入删除表单
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() =>
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
                  >
                    直接删除
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

      <div className="stack-sm">
        <div className="card-subtitle-row">
          <strong>删除审计</strong>
          <span className="help-text">当前版本已改为服务端日志，支持后台统一回看。</span>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>审计搜索</span>
            <input
              className="text-input"
              placeholder="按邮箱、public_id 或提示信息搜索"
              type="text"
              value={auditQuery}
              onChange={(event) => setAuditQuery(event.target.value)}
            />
          </label>

          <label className="field">
            <span>审计状态</span>
            <select
              className="text-input"
              value={auditStatus}
              onChange={(event) => setAuditStatus(event.target.value)}
            >
              <option value="all">all</option>
              <option value="success">success</option>
              <option value="failed">failed</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>
        </div>

        <div className="inline-actions">
          <button className="ghost-button" type="button" disabled={!authenticatedEmail} onClick={refreshAuditEntries}>
            刷新审计
          </button>
        </div>

        {auditEntries.length === 0 ? (
          <p className="help-text">还没有删除审计记录。</p>
        ) : (
          <ul className="recent-list">
            {auditEntries.map((entry) => (
              <li key={entry.id} className="recent-item audit-item">
                <div className="stack-sm compact-stack">
                  <strong>{entry.publicId || "unknown-public-id"}</strong>
                  <p className="help-text">
                    {entry.actorEmail} · {new Date(entry.createdAt).toLocaleString("zh-CN")}
                  </p>
                  <p className="help-text">{entry.message}</p>
                </div>
                <div className="recent-actions">
                  <span
                    className={`status-chip ${
                      entry.status === "success"
                        ? "status-live"
                        : entry.status === "failed"
                          ? "status-danger"
                          : "status-muted"
                    }`}
                  >
                    {entry.status}
                  </span>
                  {entry.secureUrl ? (
                    <a className="text-link" href={entry.secureUrl} rel="noreferrer" target="_blank">
                      打开原图
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

async function fetchAuditEntriesFromApi(
  queryText: string,
  status: string
): Promise<AdminAuditResult["entries"] | null> {
  try {
    const query = new URLSearchParams({
      limit: "20"
    });

    if (queryText.trim()) {
      query.set("q", queryText.trim());
    }

    if (status !== "all") {
      query.set("status", status);
    }

    const response = await fetch(`/api/admin-audit?${query.toString()}`, {
      method: "GET"
    });

    const result = (await response.json()) as ApiResponse<AdminAuditResult>;
    if (!response.ok || !result.success) {
      return null;
    }

    return result.data.entries;
  } catch {
    return null;
  }
}
