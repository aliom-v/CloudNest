"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatBytes } from "@/lib/formatters";
import type { AdminAssetsResult, ApiResponse } from "@/types/api";
import type { UploadedAsset } from "@/types/asset";

type AssetListProps = {
  authenticatedEmail: string | null;
  selectedPublicIds: string[];
  onSelectToggle: (publicId: string) => void;
  onApplyAsset: (asset: UploadedAsset) => void;
  onDirectDelete: (asset: UploadedAsset) => void;
  onSelectAll: (assets: UploadedAsset[]) => void;
  onClearSelection: () => void;
  invalidate: boolean;
};

export function AssetList({
  authenticatedEmail,
  selectedPublicIds,
  onSelectToggle,
  onApplyAsset,
  onDirectDelete,
  onSelectAll,
  onClearSelection,
  invalidate
}: AssetListProps) {
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [feedback, setFeedback] = useState("登录后可读取 Cloudinary 中当前目录下的真实资源。");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [pageSize, setPageSize] = useState("24");
  const debounceRef = useRef<ReturnType<typeof window.setTimeout> | undefined>(undefined);

  const loadAssets = useCallback(
    async (cursor?: string) => {
      if (!authenticatedEmail) {
        setLoadState("error");
        setFeedback("请先登录管理员会话。");
        return;
      }

      setLoadState("loading");
      setFeedback(cursor ? "正在加载更多..." : "正在读取 Cloudinary 资源列表...");

      try {
        const params = new URLSearchParams({ maxResults: pageSize });
        if (query.trim()) params.set("q", query.trim());
        if (cursor) params.set("cursor", cursor);

        const response = await fetch(`/api/admin-assets?${params.toString()}`);
        const result = (await response.json()) as ApiResponse<AdminAssetsResult>;

        if (!response.ok || !result.success) {
          setLoadState("error");
          setFeedback(result.message || "读取资源列表失败。");
          return;
        }

        setAssets((current) => {
          const merged = cursor ? [...current, ...result.data.assets] : result.data.assets;
          const deduped = new Map(merged.map((asset) => [asset.id, asset]));
          return Array.from(deduped.values());
        });
        setNextCursor(result.data.nextCursor || null);
        setLoadState("ready");
        setFeedback(
          result.data.assets.length > 0
            ? "已读取 Cloudinary 资源。"
            : "当前目录下没有可显示的 Cloudinary 资源。"
        );
      } catch (error) {
        setLoadState("error");
        setFeedback(error instanceof Error ? error.message : "读取资源列表失败。");
      }
    },
    [authenticatedEmail, pageSize, query]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (authenticatedEmail) {
        loadAssets();
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, authenticatedEmail]);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const formatMatch = formatFilter === "all" ? true : (asset.format || "unknown") === formatFilter;
      return formatMatch;
    });
  }, [assets, formatFilter]);

  const formatOptions = useMemo(() => {
    return Array.from(new Set(assets.map((asset) => asset.format || "unknown"))).sort();
  }, [assets]);

  const selectedCount = useMemo(() => {
    return filteredAssets.filter((asset) => selectedPublicIds.includes(asset.publicId)).length;
  }, [filteredAssets, selectedPublicIds]);

  return (
    <div className="stack-sm">
      <div className="card-subtitle-row">
        <strong>Cloudinary 真实资源列表</strong>
        <span className="help-text">通过服务端 Admin API 获取资源；输入关键词时自动服务端搜索。</span>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>搜索资源</span>
          <input
            className="text-input"
            placeholder="按文件名、public_id 或标签搜索（自动搜索）"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <label className="field">
          <span>格式筛选</span>
          <select className="text-input" value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)}>
            <option value="all">all</option>
            {formatOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>每页数量</span>
          <select className="text-input" value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
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
          disabled={filteredAssets.length === 0}
          onClick={() => onSelectAll(filteredAssets)}
        >
          全选当前筛选结果
        </button>

        <button
          className="ghost-button"
          type="button"
          disabled={selectedPublicIds.length === 0}
          onClick={onClearSelection}
        >
          清空选择
        </button>

        <button
          className="ghost-button"
          type="button"
          disabled={!authenticatedEmail || loadState === "loading"}
          onClick={() => loadAssets()}
        >
          {loadState === "loading" ? "读取中..." : "读取 Cloudinary 资源"}
        </button>

        {nextCursor ? (
          <button
            className="ghost-button"
            type="button"
            disabled={loadState === "loading"}
            onClick={() => loadAssets(nextCursor)}
          >
            读取更多
          </button>
        ) : null}
      </div>

      <p className="help-text">{feedback}</p>

      {assets.length === 0 ? (
        <p className="help-text">还没有加载到远端资源。配置好服务端环境变量后点击上面的按钮即可读取。</p>
      ) : filteredAssets.length === 0 ? (
        <p className="help-text">当前筛选条件下没有匹配的资源。</p>
      ) : (
        <ul className="recent-list">
          {filteredAssets.map((asset) => (
            <li key={asset.id} className="recent-item">
              <div className="stack-sm compact-stack">
                <label className="checkbox-row">
                  <input
                    checked={selectedPublicIds.includes(asset.publicId)}
                    type="checkbox"
                    onChange={() => onSelectToggle(asset.publicId)}
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
                <button className="ghost-button" type="button" onClick={() => onApplyAsset(asset)}>
                  填入删除表单
                </button>
                <button className="ghost-button" type="button" onClick={() => onDirectDelete(asset)}>
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
  );
}
