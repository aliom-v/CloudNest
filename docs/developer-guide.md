# CloudNest 开发维护指南

## 1. 这份文档面向谁

这份文档面向准备继续开发、维护或二次修改 CloudNest 的人。

如果你只是部署和使用，优先看：

- [README](../README.md)
- [Cloudinary 配置指南](./cloudinary-setup.md)
- [个人一键部署指南](./personal-deployment.md)
- [API 参考](./api-reference.md)

## 2. 本地开发前提

### Node 与依赖

仓库当前使用：

- Next.js 16
- React
- TypeScript
- npm 锁文件

首次本地开发：

```bash
npm install
cp .env.example .env.local
```

### 最小本地环境变量

如果你只需要调首页上传：

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

如果你还需要调后台：

- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `AUTH_ALLOWED_EMAILS`
- `ADMIN_LOGIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

## 3. 仓库结构

### 页面与 API

- `app/page.tsx`：前台上传页
- `app/admin/page.tsx`：后台页
- `app/api/*`：管理员会话、资源读取、删除、审计、签名上传接口

### 组件

- `components/upload/*`：上传工作台
- `components/result/*`：上传结果展示
- `components/admin/*`：后台登录、资源和删除联调 UI

### 业务逻辑

- `lib/env.ts`：环境变量读取和策略判断
- `lib/auth.ts`：管理员会话与白名单校验
- `lib/cloudinary.ts`：Cloudinary API 调用
- `lib/delete-service.ts`：删除业务入口
- `lib/delete-audit.ts`：审计读写
- `lib/upload-policy.ts`：上传目录和签名开放策略

### 测试

- `tests/upload-policy.test.mjs`
- `tests/cloudinary.test.mjs`

### 协作与接口文档

- [API 参考](./api-reference.md)
- [协作说明](../CONTRIBUTING.md)

## 4. 当前实现边界

### 已有能力

- 浏览器上传
- 链接复制
- 后台登录
- 真实资源读取
- 服务端搜索
- 单删/批量删除
- 删除审计

### 还没有的能力

- 第三方认证
- 限流
- 验证码
- 更细粒度权限
- 数据库存储的审计
- 固定依赖版本治理

## 5. 开发时最常用的命令

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run verify
```

### 推荐工作流

1. 修改前先确认环境变量是否满足当前调试目标
2. 改动后先跑 `npm run test`
3. 提交前跑 `npm run verify`

## 6. 关键实现说明

### 上传策略

- 首页是否能走公开 signed upload，取决于：
  - 是否存在服务端签名配置
  - `ALLOW_PUBLIC_SIGNED_UPLOAD` 是否显式为 `true`
- 如果没有公开 signed upload，就走 unsigned；若 fallback 被关掉，则前台上传不可用

### 管理员认证

- 当前不是 OAuth，也不是 NextAuth
- 逻辑是邮箱白名单 + 管理员密码
- 服务端签发 HTTP-only cookie session

### 删除边界

- 删除始终走服务端
- 删除范围受上传目录限制
- 批量删除是逐项调用删除服务并汇总结果

### 审计存储

- 优先写入 Vercel Blob
- 本地开发回退到 `.data/delete-audit.jsonl`

## 7. 已知限制

### 依赖版本策略

当前 `package.json` 仍然使用了较多 `latest` 版本。对 MVP 来说够快，但对长期维护并不稳。

### 管理员认证强度有限

当前实现适合个人版和小规模团队，不适合直接作为高暴露面的生产后台方案。

### 审计检索能力有限

当前审计读取更偏“回看最近记录”，不是完整日志平台。

## 8. 文档维护原则

后续继续改项目时，建议按这个规则同步文档：

1. 功能范围变了，先改 [项目总览](./project-overview.md)
2. 环境变量或部署方式变了，改 [Cloudinary 配置指南](./cloudinary-setup.md) 和 [个人一键部署指南](./personal-deployment.md)
3. API 路径、返回结构或鉴权方式变了，改 [API 参考](./api-reference.md)
4. 运维操作或排错方式变了，改 [使用与运维指南](./usage-and-ops.md)
5. 开发结构或验证方式变了，改当前这份文档

## 9. 这轮顺手修的项目问题

当前仓库测试通过，但之前存在 Node 在测试阶段对 TypeScript 模块的重复解析警告。

这一轮已经通过在 `package.json` 中声明 ESM 类型来收紧模块语义，减少这类无意义警告。

## 10. 建议的后续优化

- 固定依赖版本
- 为后台和审计接口补更多测试
- 增加更明确的 API 文档
- 把删除审计迁移到更适合查询的存储
- 视产品方向决定是否接入正式认证方案
