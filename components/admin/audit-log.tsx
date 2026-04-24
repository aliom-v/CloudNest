"use client";

import { useCallback, useState } from "react";

import type { AdminAuditResult, ApiResponse } from "@/types/api";

type AuditLogProps = {
  authenticatedEmail: string | null;
};

export function AuditLog({ authenticatedEmail }: AuditLogProps) {
  const [entries, setEntries] = useState<AdminAuditResult["entries"]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const fetchEntries = useCallback(async () => {
    if (!authenticatedEmail) return;
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (query.trim()) params.set("q", query.trim());
      if (status !== "all") params.set("status", status);

      const response = await fetch(`/api/admin-audit?${params.toString()}`);
      const result = (await response.json()) as ApiResponse<AdminAuditResult>;
      if (response.ok && result.success) {
        setEntries(result.data.entries);
      }
    } catch {
      /* ignore */
    }
  }, [authenticatedEmail, query, status]);

  if (!authenticatedEmail) {
    return null;
  }

  return (
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <label className="field">
          <span>审计状态</span>
          <select className="text-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">all</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
            <option value="cancelled">cancelled</option>
          </select>
        </label>
      </div>

      <div className="inline-actions">
        <button className="ghost-button" type="button" onClick={fetchEntries}>
          刷新审计
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="help-text">还没有删除审计记录，点击刷新审计。</p>
      ) : (
        <ul className="recent-list">
          {entries.map((entry) => (
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
  );
}
