import { UploadWorkbench } from "@/components/upload/upload-workbench";
import {
  allowUnsignedUploadFallback,
  getPublicEnvFlags,
  hasServerUploadSigningConfig,
  isPublicSignedUploadEnabled
} from "@/lib/env";

export default function HomePage() {
  const envFlags = getPublicEnvFlags();
  const serverSignedConfigured = hasServerUploadSigningConfig();
  const signedUploadAvailable = isPublicSignedUploadEnabled();
  const unsignedFallbackEnabled = allowUnsignedUploadFallback();

  return (
    <div className="stack-xl">
      <UploadWorkbench
        hasServerSignedUploadConfig={serverSignedConfigured}
        signedUploadAvailable={signedUploadAvailable}
        allowUnsignedFallback={unsignedFallbackEnabled}
      />

      <section className="card stack-md">
        <div className="card-header">
          <div>
            <p className="eyebrow">Environment</p>
            <h2>前端直传配置</h2>
          </div>
        </div>

        <ul className="env-grid">
          {envFlags.map((flag) => (
            <li key={flag.key} className="env-item">
              <span className={`status-dot ${flag.ready ? "status-live" : "status-muted"}`} />
              <div>
                <strong>{flag.key}</strong>
                <p>
                  {flag.ready
                    ? "已配置"
                    : flag.required &&
                        !signedUploadAvailable &&
                        unsignedFallbackEnabled &&
                        flag.key === "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET"
                      ? "缺失，unsigned 上传不可用"
                    : flag.required
                        ? "缺失"
                        : "未配置，可选"}
                </p>
              </div>
            </li>
          ))}

          <li className="env-item">
            <span
              className={`status-dot ${
                serverSignedConfigured ? "status-live" : "status-muted"
              }`}
            />
            <div>
              <strong>Server Signed Upload</strong>
              <p>
                {signedUploadAvailable
                  ? "已启用，公开访客可优先走 signed upload"
                  : serverSignedConfigured
                    ? "服务端已配置，但当前未对公开访客开放"
                    : "未启用，前端将使用 unsigned upload"}
              </p>
            </div>
          </li>

          <li className="env-item">
            <span className={`status-dot ${unsignedFallbackEnabled ? "status-live" : "status-muted"}`} />
            <div>
              <strong>Unsigned Fallback</strong>
              <p>{unsignedFallbackEnabled ? "已启用，可作为签名上传失败时的回退" : "已关闭，只允许 signed upload"}</p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  );
}
