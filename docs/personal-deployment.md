# CloudNest 个人一键部署指南

## 1. 这份文档解决什么问题

这份文档面向个人用户，目标是让你用最少的配置把 CloudNest 部署到 Vercel，并在部署后能立刻上传图片。

这里说的“一键部署”更准确地讲是：

- 一键把仓库导入到 Vercel
- 按文档填写少量 Cloudinary 环境变量
- 部署完成后即可使用

代码层面是一键导入，第三方服务配置仍然需要你自己提供。

## 2. 部署前准备

至少准备好以下内容：

- 一个 GitHub 账号
- 一个 Vercel 账号
- 一个 Cloudinary 账号

### 你至少要从 Cloudinary 拿到什么

最小可用只需要：

- `cloud name`
- 一个可用的 unsigned upload preset

如果你还想用后台管理，则额外需要：

- `API Key`
- `API Secret`

如果你还没准备好这些配置，先看 [Cloudinary 配置指南](./cloudinary-setup.md)。

## 3. 两种部署方式

### 方式 A：最省事的个人版

适合先把上传功能跑起来。

你只需要配置：

```text
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=你的_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=你的_unsigned_preset
```

可选但推荐：

```text
NEXT_PUBLIC_SITE_NAME=CloudNest
NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER=cloudnest/uploads
NEXT_PUBLIC_DEFAULT_UPLOAD_TAGS=imagebed,mvp,web-upload
ALLOW_PUBLIC_SIGNED_UPLOAD=false
ALLOW_UNSIGNED_UPLOAD_FALLBACK=true
```

部署完成后，你就可以在首页上传图片并复制链接。

### 方式 B：完整个人版

适合你自己长期使用，需要后台读取、删除和审计。

除了上面的变量，再补上：

```text
CLOUDINARY_API_KEY=你的_api_key
CLOUDINARY_API_SECRET=你的_api_secret
AUTH_ALLOWED_EMAILS=you@example.com
ADMIN_LOGIN_PASSWORD=一个强密码
ADMIN_SESSION_SECRET=一段足够长的随机字符串
ADMIN_SESSION_TTL_HOURS=24
BLOB_READ_WRITE_TOKEN=你的_blob_token
```

部署完成后，你除了首页上传，还能进入 `/admin` 做后台管理。

## 4. Vercel 部署步骤

### 第一步：导入仓库

1. 登录 Vercel
2. 点击 `Add New -> Project`
3. 选择你的 GitHub 仓库
4. 让 Vercel 自动识别为 `Next.js`
5. 保持默认构建设置

一般来说，这个项目不需要你改 `Framework Preset`、`Build Command` 或 `Output Directory`。

### 第二步：填写环境变量

建议先按“最省事的个人版”填写最少变量，让首个部署尽快成功。

如果你第一次就把后台相关变量一起填上也可以，但更推荐先让首页上传跑通，再补后台。

### 第三步：部署

点击 `Deploy`，等待首次构建完成。

### 第四步：首次检查

部署成功后，先做最小检查：

1. 打开首页
2. 上传一张图片
3. 确认能看到预览和链接
4. 确认 Cloudinary 后台里也有这张图

如果你已经配好了后台变量，再继续检查：

1. 打开 `/admin`
2. 使用白名单邮箱和后台密码登录
3. 读取 Cloudinary 资源
4. 测试单删或批量删除
5. 查看删除审计

## 5. 推荐的上线顺序

这是最稳妥的个人部署顺序：

1. 先部署“最省事的个人版”
2. 确认首页上传成功
3. 再补后台所需变量
4. 再测试 `/admin`
5. 最后补 `BLOB_READ_WRITE_TOKEN`

这样做的好处是出问题时更容易定位，不会把上传、后台、审计三个问题混在一起。

## 6. 环境变量怎么选

### 我只想要一个能上传的私人图床

用 `unsigned upload` 就够了：

- 配置少
- 最容易成功
- 最适合个人启动阶段

### 我想收紧上传策略

可以改成公开 `signed upload`：

```text
CLOUDINARY_API_KEY=你的_api_key
CLOUDINARY_API_SECRET=你的_api_secret
ALLOW_PUBLIC_SIGNED_UPLOAD=true
ALLOW_UNSIGNED_UPLOAD_FALLBACK=false
```

这适合你已经确认上传链路稳定，且不再想依赖 unsigned preset 的时候。

## 7. 生产环境建议

- `ADMIN_LOGIN_PASSWORD` 不要和其他站点共用
- `ADMIN_SESSION_SECRET` 使用足够长的随机字符串
- `AUTH_ALLOWED_EMAILS` 只放你自己的邮箱或少数可信邮箱
- 如果要长期保留审计，配置 `BLOB_READ_WRITE_TOKEN`
- 如果你有 `Preview` 环境，尽量和 `Production` 使用不同管理员密码

## 8. 常见问题

### 首页打不开或上传失败

优先检查：

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- 你在 Cloudinary 里配置的 preset 是否真的可用

### 后台打不开或不能登录

优先检查：

- `AUTH_ALLOWED_EMAILS`
- `ADMIN_LOGIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

### 后台能登录但读不到资源

优先检查：

- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER`

### 删除审计不能持久化

优先检查：

- `BLOB_READ_WRITE_TOKEN`

## 9. 适合放在仓库首页的部署文案

你可以在 README 或 GitHub 描述里这样写：

```text
几分钟部署一个属于你自己的 Cloudinary 图床，支持上传、链接复制、后台管理与删除审计。
```

## 10. 部署后下一步看什么

部署完成后，建议继续阅读：

- [Cloudinary 配置指南](./cloudinary-setup.md)
- [项目总览](./project-overview.md)
- [开发维护指南](./developer-guide.md)
- [使用与运维指南](./usage-and-ops.md)
