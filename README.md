# Croupier Dashboard

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/cuihairu/croupier/blob/main/LICENSE)

React + Umi Max + Ant Design Pro 管理界面，为 Croupier 游戏函数平台提供可视化管理功能。

> 🎯 **核心定位**：函数管理、实时监控、审批工作流、游戏数据可视化管理界面
>
> 🔗 **主仓库**：[cuihairu/croupier](https://github.com/cuihairu/croupier)
>
> 📱 **在线演示**：[Dashboard Demo](https://demo.croupier.io) （即将开放）

## Overview

Croupier Dashboard 是一个现代化的 React 应用，为游戏运营团队提供直观的函数管理和游戏数据监控平台。通过与 Croupier Server 的 REST API 对接，实现函数调用、实体管理、审批流程和系统监控等功能。

## Features

### 🚀 函数管理
- **独立函数管理界面**：全新的 `/functions` 模块，提供完整的函数生命周期管理
- **批量操作支持**：批量启用/禁用、复制、删除函数
- **高级搜索过滤**：按函数ID、名称、分类、状态快速筛选
- **实时状态监控**：函数健康状态、Agent数量、调用统计
- **可视化配置编辑**：JSON Schema编辑器、UI配置实时预览

### 📊 数据可视化
- **实时大屏**：KPI指标、留存分析、支付数据、用户行为
- **自定义仪表盘**：支持拖拽布局、组件自定义
- **多维度分析**：渠道投放、关卡数据、人群分层

### 🔐 安全与合规
- **RBAC权限控制**：细粒度的角色权限管理
- **双人审批流程**：高风险操作需要双人审批
- **操作审计日志**：完整的操作链路追踪
- **IP风控提示**：异地登录告警、操作风险提示

### 🎮 游戏运营工具
- **实体管理**：基于Schema的CRUD，支持白名单、道具、礼包等
- **玩家管理**：玩家信息查询、余额操作、封禁解封
- **任务监控**：异步任务执行状态、日志流式展示

## Quick Start

### Prerequisites

- **Node.js**: 18+ (推荐 20/22)
- **Package Manager**: pnpm 9+ (支持 npm/yarn)

### Installation

```bash
# 克隆仓库
git clone https://github.com/cuihairu/croupier-dashboard.git
cd croupier-dashboard

# 安装依赖
pnpm install
```

### Development

```bash
# 启动开发服务器
pnpm dev

# 访问 http://localhost:8000
# 默认账号：admin / admin123
```

开发模式特性：
- 🔥 热更新支持
- 🌐 API代理：`/api` → `http://localhost:8080`
- 🐛 调试工具集成
- 📊 Mock数据支持

### Production Build

```bash
# 构建生产版本
pnpm build

# 输出到 dist/ 目录
# 支持 CSP、Gzip、Tree Shaking
```

### Code Quality

```bash
# ESLint 检查
pnpm lint

# TypeScript 类型检查
pnpm tsc

# 代码格式化
pnpm format

# 运行测试
pnpm test
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Web Browser    │◄────►│ Croupier Server │◄────►│   Game Servers  │
│                 │ API │                 │ gRPC │                 │
│   React SPA     │     │   REST/HTTP     │     │   SDK (Go/Java) │
│                 │     │   Dashboard     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       │                        │                        │
       │                        │                        │
       ▼                        ▼                        ▼
   Frontend              Control Plane              Game Logic
 Dashboard              Functions Registry          SDK
 ├─ Functions           ├─ Functions List           ├─ Registration
 ├─ Analytics           ├─ Invocation               ├─ Handlers
 ├─ Games               ├─ Load Balancing           ├─ Descriptors
 ├─ Users               ├─ Job Queue                └─ Health Checks
 └─ Settings            └─ Audit Logs
```

## API Integration

### Authentication Flow

```typescript
// 登录获取 Token
POST /api/v1/auth/login
{
  "username": "admin",
  "password": "admin123"
}
// Response
{
  "token": "jwt_token_here",
  "user": {
    "id": "admin",
    "roles": ["admin"]
  }
}

// 后续请求携带 Authorization Header
Authorization: Bearer jwt_token_here
```

### Key API Endpoints

| Module | Endpoint | Description |
|--------|----------|-------------|
| **Functions** | `GET /api/v1/functions` | 获取函数列表 |
| | `POST /api/v1/functions/:id/invoke` | 调用函数 |
| | `POST /api/v1/functions/batch-update` | 批量更新状态 |
| | `GET /api/v1/functions/:id/ui` | 获取UI配置 |
| **Analytics** | `GET /api/v1/analytics/overview` | 获取概览数据 |
| | `GET /api/v1/analytics/realtime` | 实时数据 |
| **Jobs** | `GET /api/v1/jobs/:id` | 任务状态 |
| | `GET /api/v1/jobs/:id/stream` | 任务日志流(SSE) |
| **Users** | `GET /api/v1/users/current` | 当前用户信息 |
| | `PUT /api/v1/users/password` | 修改密码 |

## Configuration

### Environment Variables

```bash
# .env.local
# API 配置
CROUPIER_API_URL=http://localhost:8080
CROUPIER_WS_URL=ws://localhost:8080

# 功能开关
ENABLE_MOCK=false
ENABLE_ANALYTICS=true
ENABLE_NOTIFICATION=true

# 第三方服务
SENTRY_DSN=https://your-sentry-dsn
GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Proxy Configuration

开发环境代理配置见 `config/proxy.ts`：

```typescript
export default {
  dev: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
    '/ws': {
      target: 'ws://localhost:8080',
      ws: true,
    },
  },
}
```

## Development Guide

### Project Structure

```
src/
├── components/        # 通用组件
│   ├── JSONSchemaEditor/    # Schema编辑器
│   ├── UISchemaEditor/      # UI配置编辑器
│   └── ...
├── pages/             # 页面组件
│   ├── Functions/     # 函数管理（新增）
│   ├── Analytics/      # 数据分析
│   ├── GameManagement/ # 游戏管理
│   └── ...
├── services/          # API服务
│   └── croupier/       # Croupier API
├── hooks/             # 自定义Hooks
│   └── useFunctionInvoke/    # 函数调用
├── utils/             # 工具函数
└── types/             # TypeScript类型
```

### Adding New Pages

1. 在 `src/pages/` 创建页面组件
2. 更新 `config/routes.ts` 添加路由
3. 添加国际化配置 `src/locales/`
4. 创建服务层 `src/services/`

### Custom Hooks

```typescript
// 示例：使用函数调用Hook
import { useFunctionInvoke } from '@/hooks/useFunctionInvoke';

const MyComponent = () => {
  const { invoke, loading, error } = useFunctionInvoke({
    onSuccess: (data) => console.log('Success:', data),
    onError: (err) => message.error(err.message),
  });

  const handleInvoke = async () => {
    await invoke('player.ban', { playerId: '123', reason: 'cheat' });
  };

  return <Button onClick={handleInvoke}>Ban Player</Button>;
};
```

## Deployment

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: croupier-dashboard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: croupier-dashboard
  template:
    spec:
      containers:
      - name: dashboard
        image: croupier/dashboard:latest
        ports:
        - containerPort: 80
        env:
        - name: CROUPIER_API_URL
          value: "http://croupier-server:8080"
```

### Production Checklist

- [ ] 更新环境变量配置
- [ ] 配置CDN加速静态资源
- [ ] 启用Gzip压缩
- [ ] 配置CSP策略
- [ ] 设置错误监控（Sentry）
- [ ] 配置访问日志
- [ ] 启用HTTPS
- [ ] 配置缓存策略

## Performance Optimization

### Bundle Analysis

```bash
# 分析打包体积
pnpm analyze

# 启用gzip压缩
pnpm build:gzip
```

### Best Practices

1. **路由懒加载**：使用 `dynamic` 导入减少首屏加载
2. **组件缓存**：合理使用 `React.memo`
3. **虚拟滚动**：大数据列表使用虚拟滚动
4. **防抖节流**：搜索输入等场景使用防抖
5. **图片优化**：使用WebP格式，配置懒加载

## Contributing

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### Code Standards

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 配置
- 编写单元测试覆盖新功能
- 提交信息遵循 [Conventional Commits](https://conventionalcommits.org/)

### Issue Reporting

报告 Bug 时请提供：

- 操作系统和浏览器版本
- 重现步骤
- 预期行为和实际行为
- 相关的截图或错误日志

## License

本项目采用 Apache License 2.0 许可证。详见 [LICENSE](https://github.com/cuihairu/croupier/blob/main/LICENSE) 文件。

## Support

- 📖 [文档中心](https://docs.croupier.io)
- 💬 [讨论区](https://github.com/cuihairu/croupier/discussions)
- 🐛 [问题反馈](https://github.com/cuihairu/croupier/issues)
- 📧 邮箱：support@croupier.io
