# CloudNest

CloudNest 是一个面向个人和小团队的自部署 Cloudinary 图床。它基于 Next.js App Router 构建，当前已经具备图片直传、链接复制、管理员后台、资源搜索、单删/批量删除和删除审计等核心能力，适合先快速上线一个可用的图床 MVP，再逐步收敛到更稳定的生产方案。

> 前台负责上传和拿链接，后台负责管理和删除，底层存储、CDN 和媒体管理直接复用 Cloudinary。

仓库简介可直接使用：

```text
基于 Next.js 与 Cloudinary 的轻量图床，支持直传、管理员后台、批量删除与删除审计。
```

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/clone?repository-url=https%3A%2F%2Fgithub.com%2Faliom-v%2FCloudNest&project-name=cloudnest&repository-name=cloudnest&env=NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME%2CNEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET&envDescription=Fill+in+your+Cloudinary+cloud+name+and+an+unsigned+upload+preset+to+deploy+the+personal+edition.&envLink=https%3A%2F%2Fgithub.com%2Faliom-v%2FCloudNest%2Fblob%2Fmain%2Fdocs%2Fcloudinary-setup.md)

个人版一键部署只需要：

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

后台管理、signed upload 和审计持久化的进阶配置见 [Cloudinary 配置指南](./docs/cloudinary-setup.md) 和 [个人一键部署指南](./docs/personal-deployment.md)。

## 亮点概览

| 能力 | 当前状态 |
| --- | --- |
| 图片上传 | 浏览器直传 Cloudinary |
| 链接输出 | 原图 URL、Markdown、HTML |
| 最近记录 | 浏览器本地保存最近上传 |
| 管理后台 | 登录、资源读取、搜索、单删、批量删除 |
| 删除审计 | Vercel Blob 优先，本地 `.data/` 回退 |
| 验证方式 | `npm run verify` |

## 快速入口

| 目标 | 文档 |
| --- | --- |
| 先了解项目是什么 | [项目总览](./docs/project-overview.md) |
| 先准备 Cloudinary 配置 | [Cloudinary 配置指南](./docs/cloudinary-setup.md) |
| 尽快完成个人部署 | [个人一键部署指南](./docs/personal-deployment.md) |
| 查看接口与返回结构 | [API 参考](./docs/api-reference.md) |
| 接手继续开发 | [开发维护指南](./docs/developer-guide.md) |
| 查看协作约定 | [CONTRIBUTING.md](./CONTRIBUTING.md) |

## 适用场景

- 想快速部署一个属于自己的图床
- 希望直接复用 Cloudinary 存储、CDN 和媒体后台
- 需要一个简单可用的资源管理后台，而不是只会上传不会回收
- 准备先做个人版或 MVP，再逐步增强认证、限流和运维能力

## 当前能力

- 首页支持浏览器直传 Cloudinary
- 支持 `signed upload` 与 `unsigned upload preset` 两种上传策略
- 上传成功后返回原图 URL、Markdown 和 HTML 链接
- 浏览器本地保存最近上传记录
- `/admin` 后台支持管理员登录、资源读取、搜索、单删和批量删除
- 后台接口通过 HTTP-only cookie session 保护
- 删除审计优先写入 Vercel Blob，本地开发可回退到 `.data/` JSONL
- 提供 `lint`、`typecheck`、`test`、`build` 和一键 `verify`

## 技术栈

- Next.js 16
- React
- TypeScript
- Cloudinary Upload / Admin API
- Vercel Blob

## 快速开始

1. 复制环境变量模板：

```bash
cp .env.example .env.local
```

2. 最小可用配置至少需要：

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

这套配置会走 `unsigned upload`，最适合先把个人图床跑起来。

3. 启动项目：

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://localhost:3000
```

如果你要启用后台管理，还需要继续配置：

- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `AUTH_ALLOWED_EMAILS`
- `ADMIN_LOGIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

## 文档导航

- [项目总览](./docs/project-overview.md)
- [Cloudinary 配置指南](./docs/cloudinary-setup.md)
- [个人一键部署指南](./docs/personal-deployment.md)
- [开发维护指南](./docs/developer-guide.md)
- [API 参考](./docs/api-reference.md)
- [使用与运维指南](./docs/usage-and-ops.md)
- [协作说明](./CONTRIBUTING.md)

## 常用命令

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run verify
npm run start
```

## 验证建议

提交或部署前，至少执行：

```bash
npm run verify
```

然后手动确认：

1. 首页能正常上传图片
2. 上传结果能复制 URL / Markdown / HTML
3. `/admin` 能登录并读取资源
4. 单删、批量删除和审计读取都正常

## 当前边界

- 当前管理员认证是密码 + 白名单邮箱 + cookie session，适合个人版或小规模使用
- 生产环境建议配置 `BLOB_READ_WRITE_TOKEN`，否则删除审计无法稳定持久化
- 如果要做公开服务，建议后续补充限流、验证码、更正式的认证和固定依赖版本
