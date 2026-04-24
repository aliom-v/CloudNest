function validateRequiredEnv() {
  if (process.env.NODE_ENV !== "production") {
    const required: { key: string; hint: string }[] = [
      { key: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", hint: "Cloudinary 云名称" }
    ];

    for (const { key, hint } of required) {
      if (!process.env[key]) {
        console.warn(
          `⚠️  缺少环境变量 ${key}（${hint}）。请在 .env.local 中配置。`
        );
      }
    }
  }
}

validateRequiredEnv();

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com"
      }
    ]
  }
};

export default nextConfig;
