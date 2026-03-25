"use client";

import { useState } from "react";

type AdminSessionPanelProps = {
  authReady: boolean;
  sessionEmail: string | null;
};

export function AdminSessionPanel({ authReady, sessionEmail }: AdminSessionPanelProps) {
  const [email, setEmail] = useState(sessionEmail || "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(
    sessionEmail
      ? `当前已登录管理员：${sessionEmail}`
      : authReady
        ? "请使用白名单邮箱和管理员密码登录。"
        : "管理员认证环境变量未配置完整。"
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    if (!authReady) {
      setMessage("管理员认证环境变量未配置完整。");
      return;
    }

    setSubmitting(true);
    setMessage("正在创建管理员会话...");

    try {
      const response = await fetch("/api/admin-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      });

      const result = (await response.json()) as { success: boolean; message: string };

      if (!response.ok || !result.success) {
        setMessage(result.message || "登录失败。");
        return;
      }

      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录请求失败。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setSubmitting(true);
    setMessage("正在退出管理员会话...");

    try {
      await fetch("/api/admin-session", {
        method: "DELETE"
      });

      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "退出请求失败。");
      setSubmitting(false);
    }
  }

  return (
    <section className="card stack-md">
      <div className="card-header">
        <div>
          <p className="eyebrow">Admin Auth</p>
          <h2>管理员会话</h2>
        </div>
        <span className={`status-chip ${sessionEmail ? "status-live" : "status-muted"}`}>
          {sessionEmail ? "Session Active" : "Not Signed In"}
        </span>
      </div>

      <p className="status-message">{message}</p>

      {sessionEmail ? (
        <div className="inline-actions">
          <button className="ghost-button" type="button" onClick={handleLogout} disabled={submitting}>
            {submitting ? "退出中..." : "退出登录"}
          </button>
        </div>
      ) : (
        <>
          <div className="form-grid">
            <label className="field">
              <span>管理员邮箱</span>
              <input
                className="text-input"
                placeholder="admin@example.com"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="field">
              <span>管理员密码</span>
              <input
                className="text-input"
                placeholder="请输入管理员密码"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </div>

          <div className="inline-actions">
            <button
              className="primary-button"
              type="button"
              disabled={submitting || !authReady || !email.trim() || !password}
              onClick={handleLogin}
            >
              {submitting ? "登录中..." : "登录后台"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
