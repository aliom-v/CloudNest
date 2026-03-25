"use client";

import Image from "next/image";
import { useState } from "react";

import { buildAssetLinks, formatBytes, formatDimensions } from "@/lib/formatters";
import type { UploadedAsset } from "@/types/asset";

type AssetResultCardProps = {
  asset: UploadedAsset;
};

export function AssetResultCard({ asset }: AssetResultCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const links = buildAssetLinks(asset);

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1600);
  }

  return (
    <section className="card stack-md">
      <div className="card-header">
        <div>
          <p className="eyebrow">最新结果</p>
          <h2>上传成功</h2>
        </div>
        <span className="status-chip status-live">Cloudinary</span>
      </div>

      <div className="result-grid">
        <div className="preview-shell">
          <Image
            className="preview-image"
            src={asset.thumbnailUrl}
            alt={asset.fileName}
            width={asset.width || 1200}
            height={asset.height || 900}
          />
        </div>

        <div className="stack-md">
          <dl className="meta-list">
            <div>
              <dt>文件</dt>
              <dd>{asset.fileName}</dd>
            </div>
            <div>
              <dt>尺寸</dt>
              <dd>{formatDimensions(asset.width, asset.height)}</dd>
            </div>
            <div>
              <dt>大小</dt>
              <dd>{formatBytes(asset.bytes)}</dd>
            </div>
            <div>
              <dt>Public ID</dt>
              <dd className="break-all">{asset.publicId}</dd>
            </div>
          </dl>

          <div className="stack-sm">
            <CopyRow
              copied={copiedKey === "direct"}
              label="原图 URL"
              value={links.direct}
              onCopy={() => copyText("direct", links.direct)}
            />
            <CopyRow
              copied={copiedKey === "markdown"}
              label="Markdown"
              value={links.markdown}
              onCopy={() => copyText("markdown", links.markdown)}
            />
            <CopyRow
              copied={copiedKey === "html"}
              label="HTML"
              value={links.html}
              onCopy={() => copyText("html", links.html)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

type CopyRowProps = {
  copied: boolean;
  label: string;
  value: string;
  onCopy: () => void;
};

function CopyRow({ copied, label, value, onCopy }: CopyRowProps) {
  return (
    <div className="copy-row">
      <div className="copy-body">
        <span className="copy-label">{label}</span>
        <code className="copy-value">{value}</code>
      </div>
      <button className="ghost-button" type="button" onClick={onCopy}>
        {copied ? "已复制" : "复制"}
      </button>
    </div>
  );
}
