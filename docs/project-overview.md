# CloudNest 项目总览

## 1. 项目是什么

CloudNest 是一个基于 Next.js 和 Cloudinary 的轻量图床项目。它的目标不是重造一整套媒体存储系统，而是把前台上传体验、基础后台管理和安全删除能力补齐，让个人用户或小团队能够用更低的运维成本拥有一个可部署、可管理的图床。

这个仓库当前更接近一个“可运行的图床 MVP”，而不是一个面向多租户或重运营场景的完整媒体平台。

## 2. 适合谁用

- 个人博主、开发者、内容创作者
- 需要 Markdown 图片链接的写作者
- 想快速搭建私人图床的独立开发者
- 希望保留上传、删除和审计闭环的小团队

不太适合：

- 需要多租户、复杂权限和计费体系的团队
- 需要大规模审核、风控和运营后台的公开服务

## 3. 当前已经实现的功能

### 前台上传

- 浏览器直传 Cloudinary
- 支持 `signed upload` 和 `unsigned upload preset`
- 上传结果展示图片预览、`Public ID`、原图 URL、Markdown、HTML
- 支持复制链接
- 本地保存最近上传记录

### 管理员后台

- 管理员邮箱白名单 + 密码登录
- HTTP-only cookie session
- 读取 Cloudinary 真实资源列表
- 按关键词搜索资源
- 格式筛选、分页读取更多
- 单个删除
- 批量删除
- 删除时可选请求 CDN 失效

### 审计与验证

- 删除审计记录查询
- 审计优先写入 Vercel Blob
- 本地开发可回退到 `.data/delete-audit.jsonl`
- 提供 `npm run verify`
- 已有针对上传策略、目录边界和搜索表达式的测试

## 4. 核心路由与接口

### 页面

| 路径 | 作用 |
| --- | --- |
| `/` | 上传页面，展示上传状态、结果和最近上传 |
| `/admin` | 管理员后台，登录、读资源、删资源、看审计 |

### API

| 路径 | 作用 |
| --- | --- |
| `/api/admin-session` | 创建、读取、清除管理员会话 |
| `/api/admin-assets` | 读取 Cloudinary 资源列表或执行服务端搜索 |
| `/api/delete-image` | 删除单个资源 |
| `/api/delete-images` | 批量删除资源 |
| `/api/admin-audit` | 读取删除审计 |
| `/api/sign-cloudinary-params` | 获取服务端签名上传参数 |

## 5. 关键设计

### 上传策略

- 默认最容易跑通的方式是 `unsigned upload`
- 当配置了 Cloudinary 服务端密钥并显式开启 `ALLOW_PUBLIC_SIGNED_UPLOAD=true` 时，首页可以优先走 `signed upload`
- 如果公开 signed upload 没有开启，签名接口只允许管理员会话访问

### 删除边界

- 删除操作一律走服务端
- 删除范围受上传目录限制，不允许通过前缀碰撞删到目录外资源
- 删除请求可选择是否同时触发 CDN 失效

### 认证方式

- 当前使用白名单邮箱 + 后台密码
- 服务端签发 HTTP-only cookie session
- 这是个人版和小规模场景足够简单的方案，但不是企业级认证方案

### 审计存储

- 生产环境推荐接入 Vercel Blob
- 本地开发环境可以无数据库运行
- 如果以后要做更强检索或长期保留，建议迁移到数据库或日志系统

## 6. 环境变量分组

### 最小上传配置

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

### 服务端上传与后台配置

- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `AUTH_ALLOWED_EMAILS`
- `ADMIN_LOGIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

### 可选配置

- `NEXT_PUBLIC_SITE_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER`
- `NEXT_PUBLIC_DEFAULT_UPLOAD_TAGS`
- `ADMIN_SESSION_TTL_HOURS`
- `ALLOW_PUBLIC_SIGNED_UPLOAD`
- `ALLOW_UNSIGNED_UPLOAD_FALLBACK`
- `BLOB_READ_WRITE_TOKEN`

## 7. 当前建议

### 如果你只是个人使用

- 优先用 `unsigned upload` 先跑通
- 后台建议一起开上，方便删除和审计
- 直接部署到 Vercel 最省事

### 如果你准备公开给别人用

- 尽量切到 `signed upload`
- 稳定后关闭 `unsigned fallback`
- 补充限流、验证码和更正式的管理员认证
- 固定依赖版本，不要长期使用 `latest`

## 8. 推荐阅读顺序

1. 先看 [README](../README.md)
2. 再看 [Cloudinary 配置指南](./cloudinary-setup.md)
3. 如果你是部署者，继续看 [个人一键部署指南](./personal-deployment.md)
4. 如果你要查接口细节，看 [API 参考](./api-reference.md)
5. 部署完成后看 [使用与运维指南](./usage-and-ops.md)
6. 如果你要继续开发，最后看 [开发维护指南](./developer-guide.md)
