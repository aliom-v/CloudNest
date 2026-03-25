import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { getSiteName } from "@/lib/env";

import "./globals.css";

export const metadata: Metadata = {
  title: "CloudNest Imagebed",
  description: "A Cloudinary-backed image host scaffold built with Next.js."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const siteName = getSiteName();

  return (
    <html lang="zh-CN">
      <body>
        <div className="page-shell">
          <header className="site-header">
            <Link className="brand-lockup" href="/">
              <span className="brand-mark" />
              <span>
                <strong>{siteName}</strong>
                <small>Cloudinary imagebed scaffold</small>
              </span>
            </Link>

            <nav className="site-nav">
              <Link href="/">上传台</Link>
              <Link href="/admin">管理页</Link>
            </nav>
          </header>

          <main className="page-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
