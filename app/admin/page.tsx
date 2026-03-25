import { AdminSessionPanel } from "@/components/admin/admin-session-panel";
import { DeleteConsole } from "@/components/admin/delete-console";
import { AdminReadinessPanel } from "@/components/admin/admin-readiness-panel";
import { getAllowedAdminEmails, getCurrentAdminSessionEmail } from "@/lib/auth";
import { getServerEnvFlags, hasAdminAuthConfig, hasServerDeleteConfig } from "@/lib/env";

export default async function AdminPage() {
  const adminEmails = getAllowedAdminEmails();
  const sessionEmail = await getCurrentAdminSessionEmail();
  const deleteRouteReady = hasServerDeleteConfig();
  const authReady = hasAdminAuthConfig();
  const serverFlags = getServerEnvFlags();

  return (
    <div className="stack-xl">
      <section className="card stack-md">
        <p className="eyebrow">Admin Center</p>
        <h1>管理员后台 MVP</h1>
        <p>
          当前阶段已经具备管理员资源读取和删除联调能力。管理员入口已升级为 cookie session，会话通过服务端校验并约束后台 API。
        </p>
      </section>

      <AdminSessionPanel authReady={authReady} sessionEmail={sessionEmail} />

      <AdminReadinessPanel
        adminEmails={adminEmails}
        deleteRouteReady={deleteRouteReady}
        serverFlags={serverFlags}
      />

      <DeleteConsole
        authenticatedEmail={sessionEmail}
        deleteRouteReady={deleteRouteReady}
      />

      <section className="card stack-md">
        <div className="card-header">
          <div>
            <p className="eyebrow">Next Step</p>
            <h2>建议继续实现</h2>
          </div>
        </div>

        <ul className="feature-list">
          <li>如果不准备接第三方认证，可继续把当前 cookie session 升级成带密码轮换和登录限制的版本。</li>
          <li>把删除审计从文件日志升级到数据库或共享日志系统。</li>
          <li>继续增强后台服务端搜索精度、分页体验和批量操作回滚能力。</li>
          <li>在 signed upload 稳定后，可通过环境变量彻底关闭 unsigned fallback。</li>
        </ul>
      </section>
    </div>
  );
}
