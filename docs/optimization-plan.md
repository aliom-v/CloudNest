# CloudNest 优化计划

本文档记录 CloudNest 项目的系统优化项，按优先级从高到低排列。每项包含目标、方案和验收标准。

---

## P0 — 稳定性和安全性

### 1. 锁定依赖版本

- **现状**: `package.json` 中 `next: "latest"`、`react: "latest"` 等使用 `latest` tag，每次 `npm install` 可能拿到不同版本
- **方案**: 运行 `npm install` 后将 `package.json` 中的 `"latest"` 替换为具体版本号
- **验收**: `package.json` 中所有依赖均为具体 SemVer 版本，非 `"latest"` 或 `"^"`

### 2. 登录接口添加限流

- **现状**: `POST /api/admin-session` 无任何防暴力破解措施，攻击者可无限尝试密码
- **方案**: 基于 `node:crypto` + `Map` 实现内存级 IP 限流，5 分钟内同 IP 失败 5 次后临时封锁
- **验收**: 连续错误密码 5 次后返回 429，封锁期后自动恢复

### 3. 加强 Session Cookie 安全性

- **现状**: Cookie 名 `cloudnest_admin_session`，生产中未使用 `__Host-` 前缀
- **方案**: 
  - 使用 `__Host-cloudnest_admin_session` 前缀，强制 cookie 绑定到具体路径和协议
  - 设置 `sameSite: "strict"` 替代 `"lax"`
- **验收**: 生产环境 cookie 以 `__Host-` 开头，`SameSite=Strict`

### 4. 批量删除添加并发控制

- **现状**: 批量删除使用 `Promise.all` 同时发送所有删除请求，可能触发 Cloudinary 限流
- **方案**: 引入 `p-limit` 包，限制并发数为 5
- **验收**: 并发删除时同一时刻最多 5 个请求在途

---

## P1 — 开发体验和可维护性

### 5. 增加核心模块测试覆盖率

- **现状**: 仅 8 个测试，覆盖 `cloudinary-search-policy` 和 `upload-policy`
- **方案**: 为以下模块添加测试：
  - `lib/auth.ts` — session 创建、签名验证、过期、邮箱白名单
  - `lib/delete-service.ts` — 删除编排、边界检查、审计记录
  - `lib/delete-audit.ts` — 审计写入和读取
- **验收**: 新增至少 10+ 测试用例，全部通过

### 6. 拆分 delete-console.tsx

- **现状**: `delete-console.tsx` 706 行，承担了表单、资源列表、审计展示等多项职责
- **方案**: 拆分为以下组件：
  - `AssetList.tsx` — 资源列表展示、勾选、搜索
  - `DeleteForm.tsx` — 单删表单
  - `AuditLog.tsx` — 审计日志展示
  - `DeleteConsole.tsx` — 组合以上子组件
- **验收**: 每个组件不超过 300 行，功能完整

### 7. 启动时环境变量校验

- **现状**: 必填环境变量缺失时只在运行时炸
- **方案**: 在 `next.config.ts` 中添加 `env` 校验逻辑，缺失必填变量时构建报错
- **验收**: `next build` 时未配 `CLOUDINARY_CLOUD_NAME` 会直接报错

### 8. 添加 Prettier

- **现状**: 无代码格式化工具，代码风格依赖手动维护
- **方案**: 添加 `.prettierrc` 配置和 `npm run format` 脚本
- **验收**: `npm run format` 能自动格式化代码

---

## P2 — 增强功能

### 9. 拆分全局 CSS

- **现状**: `globals.css` 558 行，所有样式在一个文件中
- **方案**: 按功能模块拆为多个 CSS 文件，通过 `@import` 引入
- **验收**: 全局 CSS 拆为布局、组件、工具类等模块

### 10. 添加 GitHub Actions CI

- **现状**: 无 CI 配置，推送损坏代码无法自动发现
- **方案**: 创建 `.github/workflows/ci.yml`，PR 和 push 时自动 lint + typecheck + test + build
- **验收**: GitHub Actions 中能看到 CI 流水线运行

### 11. 优化删除控制台服务端搜索

- **现状**: `delete-console` 中按关键词搜索前端过滤，API 已支持服务端 `q` 参数
- **方案**: 搜索时自动调用 `loadCloudinaryAssets()` 触发服务端搜索
- **验收**: 输入关键词后自动触发服务端搜索

### 12. 添加 Docker 部署支持

- **现状**: 仅支持 Vercel 部署
- **方案**: 添加 `Dockerfile` 和 `.dockerignore`，支持 `docker build` 部署到任意 Docker 环境
- **验收**: `docker build && docker run` 能正常启动
