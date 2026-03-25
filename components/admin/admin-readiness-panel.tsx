type AdminReadinessPanelProps = {
  adminEmails: string[];
  deleteRouteReady: boolean;
  serverFlags: Array<{
    key: string;
    ready: boolean;
    required: boolean;
  }>;
};

export function AdminReadinessPanel({
  adminEmails,
  deleteRouteReady,
  serverFlags
}: AdminReadinessPanelProps) {
  return (
    <section className="card stack-md">
      <div className="card-header">
        <div>
          <p className="eyebrow">Admin Surface</p>
          <h2>后台能力概览</h2>
        </div>
        <span className={`status-chip ${deleteRouteReady ? "status-live" : "status-muted"}`}>
          {deleteRouteReady ? "Delete Route Ready" : "Config Missing"}
        </span>
      </div>

      <div className="stack-sm">
        <p>
          当前页面已经具备管理员会话、服务端删除、审计读取和 Cloudinary 资源读取能力。这里主要作为后台能力概览和环境检查面板。
        </p>
        <ul className="feature-list">
          <li>删除接口：`/api/delete-image`</li>
          <li>批量删除接口：`/api/delete-images`</li>
          <li>当前身份方案：HTTP-only cookie session</li>
          <li>邮箱白名单：{adminEmails.length > 0 ? adminEmails.join(", ") : "尚未配置"}</li>
          <li>可选后续替换点：NextAuth 或 Clerk 会话校验</li>
        </ul>

        <ul className="env-grid">
          {serverFlags.map((flag) => (
            <li key={flag.key} className="env-item">
              <span className={`status-dot ${flag.ready ? "status-live" : "status-muted"}`} />
              <div>
                <strong>{flag.key}</strong>
                <p>{flag.ready ? "已配置" : flag.required ? "缺失，删除不可用" : "未配置，可选"}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
