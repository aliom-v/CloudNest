# Contributing

这份文档面向准备修改、维护或协作开发 CloudNest 的人。

如果你只是部署和使用，优先看：

- [README](./README.md)
- [Cloudinary 配置指南](./docs/cloudinary-setup.md)
- [个人一键部署指南](./docs/personal-deployment.md)

## 目标

CloudNest 当前是一个轻量图床 MVP。协作时的优先级是：

1. 保持现有上传、后台管理和删除闭环稳定
2. 保持改动小、可验证、可回退
3. 文档和实现保持同步

## 本地开始

```bash
npm install
cp .env.example .env.local
```

最小前台调试配置：

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

如果你要调后台或 signed upload，再补：

- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `AUTH_ALLOWED_EMAILS`
- `ADMIN_LOGIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

## 开发命令

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run verify
```

提交前至少运行：

```bash
npm run verify
```

## 提交改动时的约定

### 1. 保持范围小

- 不把文档整理、功能新增和大规模重构混在同一个改动里
- 不因为顺手而引入新依赖
- 没有明确收益时，不要扩大改动面

### 2. 改行为就补验证

- 改上传策略、删除逻辑、搜索语义或权限边界时，优先补测试
- 改 UI 文案但不改行为时，至少跑 `npm run verify`

### 3. 改文档要和实现对齐

功能范围变化时，至少同步检查这些文档：

- [项目总览](./docs/project-overview.md)
- [Cloudinary 配置指南](./docs/cloudinary-setup.md)
- [个人一键部署指南](./docs/personal-deployment.md)
- [开发维护指南](./docs/developer-guide.md)
- [API 参考](./docs/api-reference.md)
- [使用与运维指南](./docs/usage-and-ops.md)

## 当前协作边界

- 当前管理员认证是密码 + 白名单邮箱 + HTTP-only cookie session
- 当前审计优先写入 Vercel Blob，本地开发回退到 `.data/`
- 当前依赖虽然已声明 ESM，但版本策略仍偏 MVP

这些都不是不能改，但改之前要明确收益和风险。

## 适合优先改进的方向

- 固定依赖版本
- 补更多 API 和边界测试
- 收紧上传策略
- 增强后台筛选和分页体验
- 把审计迁移到更适合查询的存储

## 不建议直接做的事

- 未经验证就重做认证体系
- 在没有需求的情况下引入数据库
- 为了“更工程化”而拆过多抽象层
- 在没有回归验证时修改删除边界和上传权限逻辑

## 提交说明

如果你要提交 git commit，这个仓库使用 Lore 风格提交信息。核心要求是：

- 第一行写“为什么改”，不是“改了什么”
- 在正文或 trailer 里说明约束、验证和已知未测项

如果你不确定该怎么写，先看仓库内的 AGENTS 约定再提交。
