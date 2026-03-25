# CloudNest 图床

CloudNest 是一个基于 Next.js App Router 和 Cloudinary 的轻量图床项目，当前已经具备图片上传、管理员登录、资源读取、单个删除、批量删除和删除审计这些核心能力，适合先把可用的图床 MVP 跑起来，再继续往生产化方向扩展。

## 当前能力

- 首页支持浏览器直传 Cloudinary
- 优先走服务端签名上传，必要时可回退到 unsigned upload preset
- 上传成功后提供原图链接、Markdown 链接和 HTML 链接
- 浏览器本地保存最近上传记录
- `/admin` 后台支持管理员登录、资源列表读取、单删和批量删除
- 后台接口通过 HTTP-only cookie session 保护
- 删除审计优先写入 Vercel Blob，本地开发环境可回退到 `.data/` JSONL

## 技术栈

- Next.js 16
- React
- TypeScript
- Cloudinary Upload / Admin API
- Vercel Blob

## 环境变量

先复制一份环境文件：

```bash
cp .env.example .env.local
```

项目使用到的变量如下：

| 变量名 | 说明 | 是否必填 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_NAME` | 站点名称 | 否 |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary 云名称 | 是 |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | unsigned 上传 preset；当你依赖 unsigned 上传或回退时需要 | 条件必填 |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER` | 上传目录，默认 `cloudnest/uploads` | 否 |
| `NEXT_PUBLIC_DEFAULT_UPLOAD_TAGS` | 默认标签列表 | 否 |
| `CLOUDINARY_API_KEY` | Cloudinary API Key，用于签名上传、后台资源读取、删除 | 签名上传和后台必填 |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret，用于签名上传、后台资源读取、删除 | 签名上传和后台必填 |
| `AUTH_ALLOWED_EMAILS` | 管理员邮箱白名单，多个邮箱用逗号分隔 | 后台必填 |
| `ADMIN_LOGIN_PASSWORD` | 后台登录密码 | 后台必填 |
| `ADMIN_SESSION_SECRET` | 后台会话签名密钥 | 后台必填 |
| `ADMIN_SESSION_TTL_HOURS` | 后台会话有效时长，默认 24 小时 | 否 |
| `ALLOW_UNSIGNED_UPLOAD_FALLBACK` | 是否允许 signed upload 失败后回退到 unsigned，默认 `true` | 否 |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob Token，用于持久化删除审计 | 否 |

说明：

- 如果你只想先把上传链路跑通，至少需要配置 `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`，以及以下两种方案中的一种：
- 方案 A：配置 `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`，走 unsigned 上传。
- 方案 B：配置 `CLOUDINARY_API_KEY` 和 `CLOUDINARY_API_SECRET`，走 signed 上传。
- 如果你要测试 `/admin` 后台，除了 Cloudinary 服务端密钥，还需要配置 `AUTH_ALLOWED_EMAILS`、`ADMIN_LOGIN_PASSWORD`、`ADMIN_SESSION_SECRET`。

## 本地启动

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://localhost:3000
```

## 项目脚本

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run start
```

## 怎么测试

建议至少按下面顺序走一遍。

### 1. 静态校验

```bash
npm run lint
npm run typecheck
npm run build
```

这三步分别用于检查 ESLint、TypeScript 类型和生产构建是否正常。

### 2. 手动测试上传链路

1. 配好 `.env.local` 后启动开发服务器。
2. 打开首页 `http://localhost:3000`。
3. 选择一张 JPG、PNG、WEBP 或 GIF 图片，单文件建议不超过 10MB。
4. 点击“上传到 Cloudinary”。
5. 确认页面出现上传成功提示。
6. 确认结果面板里能看到图片预览、`Public ID` 和可复制链接。
7. 确认“最近上传”列表新增了刚上传的图片。

### 3. 手动测试后台链路

1. 确保已经配置后台所需环境变量。
2. 打开 `http://localhost:3000/admin`。
3. 使用白名单邮箱和后台密码登录。
4. 先读取 Cloudinary 资源列表，确认后台能拿到真实资源。
5. 选中一张刚上传的图片执行单删，确认删除成功。
6. 再测试批量删除，确认成功和失败数量反馈正常。
7. 检查后台审计列表，确认删除记录已经写入。

### 4. 审计存储验证

- 如果配置了 `BLOB_READ_WRITE_TOKEN`，删除审计会写到 Vercel Blob。
- 如果没有配置，开发环境会回退到本地 `.data/` 目录。

## 适合写在 GitHub 的项目描述

你可以直接用下面这句作为仓库简介：

```text
基于 Next.js 与 Cloudinary 的轻量图床，支持直传、管理员后台、批量删除与删除审计。
```

如果你想更偏 MVP 感一点，可以用这句：

```text
一个基于 Next.js App Router 的 Cloudinary 图床 MVP，包含上传、后台管理和删除审计。
```

## 后续建议

- 把管理员认证从当前的密码 + cookie session 升级为更完整的认证方案
- 把删除审计迁移到数据库或更适合查询的日志系统
- 继续补充搜索、筛选、分页和批量操作回滚能力
- 在 signed upload 验证稳定后，考虑彻底关闭 unsigned fallback
