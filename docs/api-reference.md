# CloudNest API 参考

这份文档记录当前仓库已经实现的 API 路由、请求参数、返回结构和主要状态语义。

所有接口统一返回 JSON，基础结构是：

```ts
type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

type ApiFailure = {
  success: false;
  message: string;
  details?: string;
};
```

## 1. 认证模型

除了公开上传页面使用的前台逻辑，后台相关 API 基本都要求管理员会话。

当前管理员认证方式：

- 白名单邮箱
- 管理员密码
- 服务端签发的 HTTP-only cookie session

需要管理员会话的接口：

- `GET /api/admin-session`
- `GET /api/admin-assets`
- `GET /api/admin-audit`
- `POST /api/delete-image`
- `POST /api/delete-images`
- `POST /api/sign-cloudinary-params`（当未开启公开 signed upload 时）

常见未授权返回：

```json
{
  "success": false,
  "message": "缺少有效管理员会话，请先登录后台。"
}
```

## 2. `GET /api/admin-session`

读取当前管理员会话。

### 成功返回

```json
{
  "success": true,
  "message": "Admin session is active",
  "data": {
    "email": "admin@example.com",
    "expiresAt": "active"
  }
}
```

### 失败状态

- `401`：当前没有有效管理员会话

## 3. `POST /api/admin-session`

创建管理员会话。

### 请求体

```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

### 成功返回

```json
{
  "success": true,
  "message": "Admin session created",
  "data": {
    "email": "admin@example.com",
    "expiresAt": "2026-04-01T12:34:56.000Z"
  }
}
```

### 失败状态

- `400`：请求体不是合法 JSON，或邮箱/密码为空
- `403`：邮箱不在白名单，或管理员密码错误
- `500`：认证环境变量未配置完整

## 4. `DELETE /api/admin-session`

清除管理员会话。

### 成功返回

```json
{
  "success": true,
  "message": "Admin session cleared"
}
```

## 5. `GET /api/admin-assets`

读取 Cloudinary 资源列表；当携带查询词时，改为服务端搜索当前上传目录。

### 查询参数

| 参数 | 说明 |
| --- | --- |
| `q` | 搜索关键词，可选 |
| `cursor` | Cloudinary 分页游标，可选 |
| `maxResults` | 每页数量，默认 `24`，硬上限 `50` |

### 成功返回

```json
{
  "success": true,
  "message": "Assets retrieved successfully",
  "data": {
    "assets": [
      {
        "id": "asset-id",
        "publicId": "cloudnest/uploads/demo",
        "secureUrl": "https://res.cloudinary.com/...",
        "thumbnailUrl": "https://res.cloudinary.com/...",
        "fileName": "demo.png",
        "bytes": 12345,
        "width": 1200,
        "height": 800,
        "format": "png",
        "resourceType": "image",
        "deliveryType": "upload",
        "tags": [
          "imagebed"
        ],
        "createdAt": "2026-04-01T10:00:00.000Z"
      }
    ],
    "nextCursor": "next-cursor-if-any"
  }
}
```

### 失败状态

- `401` / `403`：管理员未授权
- `500`：Cloudinary 服务端密钥未配置完整
- `502`：Cloudinary 资源读取或搜索失败

## 6. `GET /api/admin-audit`

读取删除审计。

### 查询参数

| 参数 | 说明 |
| --- | --- |
| `q` | 按邮箱、`publicId` 或提示信息搜索 |
| `status` | `all`、`success`、`failed`、`cancelled` |
| `limit` | 返回条数，默认 `20`，上限 `50` |

### 成功返回

```json
{
  "success": true,
  "message": "Audit entries retrieved successfully",
  "data": {
    "entries": [
      {
        "id": "audit-id",
        "actorEmail": "admin@example.com",
        "publicId": "cloudnest/uploads/demo",
        "resourceType": "image",
        "secureUrl": "https://res.cloudinary.com/...",
        "action": "delete",
        "status": "success",
        "message": "Deleted successfully",
        "createdAt": "2026-04-01T10:00:00.000Z"
      }
    ]
  }
}
```

### 失败状态

- `401` / `403`：管理员未授权

## 7. `POST /api/delete-image`

删除单个资源。

### 请求体

```json
{
  "publicId": "cloudnest/uploads/demo",
  "resourceType": "image",
  "invalidate": true,
  "secureUrl": "https://res.cloudinary.com/..."
}
```

说明：

- `resourceType` 可选，默认通常按 `image` 使用
- `invalidate` 可选，用于请求 CDN 失效
- `secureUrl` 可选，主要用于审计记录补全

### 成功返回

```json
{
  "success": true,
  "message": "Asset deleted successfully",
  "data": {
    "publicId": "cloudnest/uploads/demo",
    "result": "ok"
  }
}
```

### 常见失败状态

- `400`：请求体不是合法 JSON 或请求参数无效
- `401` / `403`：管理员未授权
- 其他状态由删除服务按失败原因返回

## 8. `POST /api/delete-images`

批量删除资源。

### 请求体

```json
{
  "items": [
    {
      "publicId": "cloudnest/uploads/demo-1",
      "resourceType": "image",
      "invalidate": true
    },
    {
      "publicId": "cloudnest/uploads/demo-2",
      "resourceType": "image",
      "invalidate": true
    }
  ]
}
```

### 成功返回

全部成功时是 `200`，部分成功时是 `207`，全部失败时响应体仍是统一结果结构但 HTTP 状态会更高。

```json
{
  "success": true,
  "message": "Batch delete completed with partial failures",
  "data": {
    "total": 2,
    "succeeded": 1,
    "failed": 1,
    "results": [
      {
        "success": true,
        "data": {
          "publicId": "cloudnest/uploads/demo-1",
          "result": "ok"
        }
      },
      {
        "success": false,
        "status": 403,
        "message": "超出允许删除目录。",
        "publicId": "cloudnest/uploads/demo-2"
      }
    ]
  }
}
```

### 失败状态

- `400`：请求体不是合法 JSON，或 `items` 为空
- `401` / `403`：管理员未授权
- `207`：部分成功、部分失败
- `502`：全部失败时可能出现

## 9. `POST /api/sign-cloudinary-params`

获取服务端签名上传参数。

### 开放规则

- 如果服务端签名能力未配置，返回 `501`
- 如果开启了公开 signed upload，还会校验同源请求
- 如果没有开启公开 signed upload，则要求管理员会话

### 成功返回

```json
{
  "success": true,
  "message": "Signed upload parameters generated",
  "data": {
    "apiKey": "your-api-key",
    "timestamp": 1711968000,
    "signature": "generated-signature",
    "folder": "cloudnest/uploads",
    "tags": "imagebed,mvp,web-upload"
  }
}
```

### 失败状态

- `401` / `403`：未授权，或公开 signed upload 的同源校验失败
- `500`：服务端密钥未配置完整
- `501`：签名上传未启用

## 10. 资源对象结构

`GET /api/admin-assets` 返回的资源对象当前结构如下：

```ts
type UploadedAsset = {
  id: string;
  publicId: string;
  secureUrl: string;
  thumbnailUrl: string;
  fileName: string;
  bytes: number;
  width?: number;
  height?: number;
  format?: string;
  resourceType: "image" | "video" | "raw";
  deliveryType?: string;
  tags?: string[];
  createdAt: string;
};
```

## 11. 审计对象结构

```ts
type DeleteAuditEntry = {
  id: string;
  actorEmail: string;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  secureUrl?: string;
  action: "delete";
  status: "success" | "failed" | "cancelled";
  message: string;
  createdAt: string;
};
```

## 12. 维护建议

如果你修改了 API 的路径、返回结构、鉴权方式或状态语义，记得同时更新：

- [项目总览](./project-overview.md)
- [开发维护指南](./developer-guide.md)
- [使用与运维指南](./usage-and-ops.md)
- 当前这份 API 文档
