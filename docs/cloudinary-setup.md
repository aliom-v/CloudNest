# CloudNest Cloudinary 配置指南

## 1. 这份文档解决什么问题

这份文档专门解释 CloudNest 依赖的 Cloudinary 配置怎么拿、怎么建、怎么选。

它回答的是下面这些问题：

- `cloud name` 去哪里找
- `API key` 和 `API secret` 去哪里找
- `unsigned upload preset` 怎么创建
- 什么时候该继续用 unsigned，什么时候该切到 signed

## 2. CloudNest 到底依赖 Cloudinary 的什么能力

CloudNest 当前主要用到两类能力：

### 前台上传

- 最简单的个人版：依赖 `cloud name + unsigned upload preset`
- 更收敛的版本：依赖 `cloud name + API key + API secret + signed upload`

### 后台管理

- 读取 Cloudinary 资源
- 删除资源
- 服务端生成签名上传参数

这些后台能力都依赖：

- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## 3. 先准备什么账号和权限

你至少需要一个 Cloudinary 账号。

根据 Cloudinary 官方文档：

- 只找 `cloud name` 时，可以直接在 Dashboard 查看
- 查 `API key` 和 `API secret` 时，需要到 Console Settings 的 API Keys 页面
- 这些凭据都对应具体的 product environment

官方参考：

- [Find your Cloudinary credentials](https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials)
- [Find your credentials tutorial](https://cloudinary.com/documentation/finding_your_credentials_tutorial)

## 4. 怎么找到 `cloud name`

按 Cloudinary 官方说明，前端配置需要的 `cloud name` 可以在 Dashboard 找到。

你在 CloudNest 里要填的是：

```text
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=你的_cloud_name
```

这个值可以出现在前端代码里，没有问题。

## 5. 怎么找到 `API key` 和 `API secret`

按 Cloudinary 官方说明：

- `API key` 和 `API secret` 在 Console Settings 的 API Keys 页面
- `API secret` 只应该保留在服务端，不能暴露到前端

你在 CloudNest 里要填的是：

```text
CLOUDINARY_API_KEY=你的_api_key
CLOUDINARY_API_SECRET=你的_api_secret
```

CloudNest 用它们来做：

- 后台资源读取
- 删除接口
- 生成 signed upload 参数

## 6. 怎么创建 unsigned upload preset

Cloudinary 官方文档说明：

- Upload Presets 可以在 Console Settings 的 Upload 页面创建
- 创建时最重要的选择之一就是它是 `signed` 还是 `unsigned`
- 对于浏览器端 unsigned upload，通常需要使用 unsigned upload preset

官方参考：

- [Upload Presets](https://cloudinary.com/documentation/upload_presets)

### 建议的创建步骤

1. 登录 Cloudinary Console
2. 进入 `Settings`
3. 打开 `Upload` 相关页面
4. 进入 `Upload Presets`
5. 点击创建新的 upload preset
6. 把它设置为 `unsigned`
7. 记下 preset 名称

然后在 CloudNest 里填写：

```text
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=你的_unsigned_preset
```

## 7. 给 CloudNest 的 unsigned preset 建议怎么配

CloudNest 是个人图床，不需要一开始就配得很复杂，但建议至少考虑这些项：

- 只允许图片格式
- 限制文件大小
- 尽量不要允许用户随意指定 public ID
- 预设默认上传目录

Cloudinary 官方文档对 unsigned preset 的建议也强调了这些保护手段，例如：

- 限制允许格式
- 限制最大文件大小
- 设置 `disallow_public_id`

官方参考：

- [Upload Presets best practices](https://cloudinary.com/documentation/upload_presets)
- [Security considerations for unsigned uploads](https://support.cloudinary.com/hc/en-us/articles/360018796451-What-are-the-security-considerations-for-unsigned-uploads)

### 对应到 CloudNest 的建议值

如果你准备先走最简单的个人版，可以先这样理解：

- 上传目录：`cloudnest/uploads`
- 默认标签：`imagebed,mvp,web-upload`
- 上传策略：先用 `unsigned`

也就是这些环境变量：

```text
NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER=cloudnest/uploads
NEXT_PUBLIC_DEFAULT_UPLOAD_TAGS=imagebed,mvp,web-upload
ALLOW_PUBLIC_SIGNED_UPLOAD=false
ALLOW_UNSIGNED_UPLOAD_FALLBACK=true
```

## 8. unsigned 和 signed 该怎么选

### 适合先用 unsigned 的情况

- 你只是个人使用
- 你优先想把上传链路跑通
- 你更在意部署简单

### 适合切到 signed 的情况

- 你准备长期公开使用
- 你想减少对 unsigned preset 的暴露
- 你愿意多配一组服务端密钥

Cloudinary 官方也明确说明：

- unsigned upload 需要配对应的 unsigned preset
- preset 名称会出现在客户端
- 如果 preset 泄露，一个补救办法是改 preset 名称或切到 signed upload

## 9. CloudNest 里各变量怎么对应

### 只开前台上传

```text
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
```

### 开后台管理

```text
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
AUTH_ALLOWED_EMAILS
ADMIN_LOGIN_PASSWORD
ADMIN_SESSION_SECRET
```

### 开公开 signed upload

```text
ALLOW_PUBLIC_SIGNED_UPLOAD=true
```

### 关闭 unsigned fallback

```text
ALLOW_UNSIGNED_UPLOAD_FALLBACK=false
```

## 10. 推荐配置路线

最推荐的顺序是：

1. 先找 `cloud name`
2. 先建一个可用的 unsigned preset
3. 先把前台上传跑通
4. 再补 `API key` 和 `API secret`
5. 再启用后台
6. 最后再决定是否切到 signed upload

## 11. 常见错误

### 找到了 Cloudinary 账号，但首页还是不能传

通常是下面几种原因：

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` 填错
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` 填错
- 这个 preset 不是 unsigned
- preset 已删除或名称变了

### 后台能打开，但读不到资源

通常是：

- `CLOUDINARY_API_KEY` 或 `CLOUDINARY_API_SECRET` 没配
- 配的是别的 product environment 的凭据
- 上传目录配置和你实际上传目录不一致

## 12. 下一步看什么

配置准备好之后，继续看：

- [个人一键部署指南](./personal-deployment.md)
- [使用与运维指南](./usage-and-ops.md)
