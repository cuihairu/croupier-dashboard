# Croupier Dashboard

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/cuihairu/croupier/blob/main/LICENSE)

React + Umi Max + Ant Design Pro 管理界面，为 Croupier 游戏函数平台提供可视化管理功能。

> 🎯 **核心定位**：配置驱动的可视化编排平台，快速搭建游戏管理后台
>
> 🔗 **主仓库**：[cuihairu/croupier](https://github.com/cuihairu/croupier)
>
> 📱 **在线演示**：[Dashboard Demo](https://demo.croupier.io) （即将开放）

## Overview

Croupier Dashboard 是一个基于配置驱动的可视化编排平台，通过函数注册和 UI 编排，让游戏运营团队无需编写代码即可快速搭建管理界面。核心理念是**职责分离**：SDK 专注函数注册，Dashboard 专注 UI 编排和权限管理。

### 核心价值

- **快速搭建**：从几小时到几分钟，通过可视化编排快速创建管理界面
- **配置驱动**：所有 UI 由配置决定，修改界面无需改代码
- **职责清晰**：SDK 提供函数元数据，Dashboard 负责 UI 编排
- **灵活编排**：支持多种布局类型，自由组合函数功能

## Design Philosophy

### 职责分离原则

```
┌─────────────────────────────────────────────────────────────┐
│                     Croupier 架构设计                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SDK (Go/Java/...)              Dashboard (React)           │
│  ┌──────────────────┐          ┌──────────────────┐        │
│  │                  │          │                  │        │
│  │  函数注册         │          │  UI 编排         │        │
│  │  - 函数元数据     │          │  - 布局设计      │        │
│  │  - Input Schema  │  ────►   │  - 函数组合      │        │
│  │  - Output Schema │          │  - 配置管理      │        │
│  │  - 业务逻辑      │          │  - 权限分配      │        │
│  │                  │          │                  │        │
│  └──────────────────┘          └──────────────────┘        │
│         ▲                              │                    │
│         │                              ▼                    │
│         │                      ┌──────────────────┐        │
│         │                      │  配置中心         │        │
│         │                      │  - WorkspaceConfig│        │
│         └──────────────────────│  - 持久化存储     │        │
│                                └──────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

**核心理念**：

- **SDK 只关心功能注册**：提供函数元数据（ID、输入输出 Schema、操作类型）
- **Dashboard 关注 UI 和权限**：负责界面编排、布局设计、权限分配
- **配置驱动 UI**：所有界面由 WorkspaceConfig 配置决定，修改配置即可改变界面

### Workspace 编排系统

Workspace 是将多个函数组合成一个完整管理界面的核心概念：

```typescript
// 示例：玩家管理 Workspace
{
  objectKey: "player",
  title: "玩家管理",
  layout: {
    type: "tabs",
    tabs: [
      {
        key: "info",
        title: "玩家信息",
        functions: ["player.getInfo", "player.updateLevel", "player.addGold"],
        layout: {
          type: "form-detail",  // 先查询，再显示详情和操作
          queryFunction: "player.getInfo",
          detailSections: [...],
          actions: [...]
        }
      },
      {
        key: "list",
        title: "玩家列表",
        functions: ["player.list"],
        layout: {
          type: "list",  // 列表布局
          listFunction: "player.list",
          columns: [...]
        }
      }
    ]
  }
}
```

## Features

### 🎨 可视化编排工具

- **拖拽式设计**：通过拖拽函数到布局设计器，快速组合界面
- **实时预览**：配置修改后立即看到效果
- **配置模板**：提供常用模板（列表、表单-详情、完整管理等）
- **布局类型**：
  - **Tabs 布局**：多标签页组织
  - **FormDetail 布局**：先查询，再显示详情和操作
  - **List 布局**：数据列表展示
  - **Form 布局**：表单提交
  - **Detail 布局**：详情展示

### 🚀 配置驱动渲染

- **Layout Engine**：根据配置自动渲染界面
- **动态路由**：运行时注册路由，无需重启
- **配置管理**：配置的增删改查、版本管理
- **配置缓存**：Redis 缓存提升性能

### 🔐 权限与安全

- **RBAC 权限控制**：细粒度的角色权限管理
- **函数级权限**：控制每个函数的访问权限
- **操作审计日志**：完整的操作链路追踪

### 📊 数据可视化

- **实时大屏**：KPI 指标、留存分析、支付数据
- **自定义仪表盘**：支持拖拽布局、组件自定义
- **多维度分析**：渠道投放、关卡数据、人群分层

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
- 🌐 API 代理：`/api` → `http://localhost:18780`
- 🐛 调试工具集成
- 📊 Mock 数据支持

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

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Croupier 生态系统                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │              │      │              │      │              │ │
│  │  Dashboard   │◄────►│   Server     │◄────►│  Game SDK    │ │
│  │   (React)    │ HTTP │   (Go)       │ gRPC │  (Go/Java)   │ │
│  │              │      │              │      │              │ │
│  └──────────────┘      └──────────────┘      └──────────────┘ │
│         │                     │                      │          │
│         │                     │                      │          │
│         ▼                     ▼                      ▼          │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │ UI 编排      │      │ 函数注册中心  │      │ 函数实现     │ │
│  │ - Workspace  │      │ - Descriptors│      │ - Handlers   │ │
│  │ - Layout     │      │ - Routing    │      │ - Metadata   │ │
│  │ - Config     │      │ - Invocation │      │ - Schema     │ │
│  └──────────────┘      └──────────────┘      └──────────────┘ │
│         │                     │                                 │
│         ▼                     ▼                                 │
│  ┌──────────────────────────────────────┐                      │
│  │         配置中心 (PostgreSQL)         │                      │
│  │  - WorkspaceConfig (UI 配置)         │                      │
│  │  - Permissions (权限配置)            │                      │
│  │  - Routes (路由配置)                 │                      │
│  └──────────────────────────────────────┘                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 核心模块

#### 1. Layout Engine（布局引擎）

根据 WorkspaceConfig 动态渲染界面：

```typescript
// WorkspaceRenderer 组件
<WorkspaceRenderer config={workspaceConfig} />

// 自动渲染为：
<Tabs>
  <TabPane key="info">
    <FormDetailRenderer layout={tab.layout} />
  </TabPane>
  <TabPane key="list">
    <ListRenderer layout={tab.layout} />
  </TabPane>
</Tabs>
```

#### 2. Workspace Editor（可视化编排器）

```
┌─────────────────────────────────────────────────────────────┐
│                    Workspace Editor                          │
├─────────────┬─────────────────────────┬─────────────────────┤
│             │                         │                     │
│  函数列表    │    布局设计器            │    实时预览         │
│             │                         │                     │
│  [拖拽]     │  ┌─ Tab 1: 玩家信息     │  ┌───────────────┐ │
│  player.    │  │  - 布局: form-detail │  │ 查询表单      │ │
│  getInfo    │  │  - 函数: [...]       │  │ ┌───────────┐ │ │
│             │  │                      │  │ │ 玩家ID    │ │ │
│  player.    │  ├─ Tab 2: 玩家列表     │  │ └───────────┘ │ │
│  list       │  │  - 布局: list        │  │               │ │
│             │  │  - 函数: [...]       │  │ 详情展示      │ │
│  player.    │  │                      │  │ - 昵称: xxx   │ │
│  updateLevel│  └─ [添加 Tab]          │  │ - 等级: 50    │ │
│             │                         │  └───────────────┘ │
│             │  [保存配置]              │                     │
└─────────────┴─────────────────────────┴─────────────────────┘
```

#### 3. Configuration Service（配置服务）

```typescript
// 配置管理 API
interface ConfigService {
  // 加载配置
  loadWorkspaceConfig(objectKey: string): Promise<WorkspaceConfig>;

  // 保存配置
  saveWorkspaceConfig(config: WorkspaceConfig): Promise<void>;

  // 配置列表
  listWorkspaceConfigs(): Promise<WorkspaceConfig[]>;

  // 删除配置
  deleteWorkspaceConfig(objectKey: string): Promise<void>;
}

// 配置缓存
// Redis: workspace:config:{objectKey} -> WorkspaceConfig JSON
```

## API Integration

### Workspace Configuration API

Dashboard 通过以下 API 管理 Workspace 配置：

```typescript
// 1. 获取 Workspace 配置
GET /api/v1/workspaces/:objectKey/config
Response: {
  "objectKey": "player",
  "title": "玩家管理",
  "layout": {
    "type": "tabs",
    "tabs": [...]
  }
}

// 2. 保存 Workspace 配置
PUT /api/v1/workspaces/:objectKey/config
Body: WorkspaceConfig

// 3. 获取配置列表
GET /api/v1/workspaces/configs
Response: [
  { "objectKey": "player", "title": "玩家管理", ... },
  { "objectKey": "order", "title": "订单管理", ... }
]

// 4. 删除配置
DELETE /api/v1/workspaces/:objectKey/config
```

### Function Descriptor API

SDK 注册的函数元数据通过以下 API 获取：

```typescript
// 1. 获取函数描述符列表
GET /api/v1/functions/descriptors
Response: [
  {
    "id": "player.getInfo",
    "entity": "player",
    "operation": "query",
    "display_name": { "zh": "获取玩家信息", "en": "Get Player Info" },
    "input_schema": { ... },  // OpenAPI 3.0 Schema
    "output_schema": { ... }
  },
  ...
]

// 2. 调用函数
POST /api/v1/functions/:id/invoke
Body: { "playerId": "123" }
Response: { "playerId": "123", "nickname": "张三", ... }
```

### Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      数据流转示意图                           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. 页面加载                                                  │
│     Dashboard ──GET /workspaces/player/config──► Server      │
│                                                               │
│  2. 渲染界面                                                  │
│     WorkspaceRenderer ──根据 config──► 渲染 Tabs + Layouts   │
│                                                               │
│  3. 用户操作                                                  │
│     用户点击"查询" ──POST /functions/player.getInfo/invoke──►│
│     Server ──gRPC──► Game SDK ──执行函数──► 返回结果         │
│                                                               │
│  4. 配置编辑                                                  │
│     WorkspaceEditor ──拖拽设计──► 生成 config                │
│     保存按钮 ──PUT /workspaces/player/config──► Server       │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

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

| Module         | Endpoint                                | Description        |
| -------------- | --------------------------------------- | ------------------ |
| **Workspaces** | `GET /api/v1/workspaces/configs`        | 获取所有 Workspace |
|                | `GET /api/v1/workspaces/:key/config`    | 获取指定配置       |
|                | `PUT /api/v1/workspaces/:key/config`    | 保存配置           |
|                | `DELETE /api/v1/workspaces/:key/config` | 删除配置           |
| **Functions**  | `GET /api/v1/functions/descriptors`     | 获取函数描述符列表 |
|                | `POST /api/v1/functions/:id/invoke`     | 调用函数           |
|                | `GET /api/v1/functions/:id/openapi`     | 获取函数 OpenAPI   |
| **Analytics**  | `GET /api/v1/analytics/overview`        | 获取概览数据       |
|                | `GET /api/v1/analytics/realtime`        | 实时数据           |
| **Jobs**       | `GET /api/v1/jobs/:id`                  | 任务状态           |
|                | `GET /api/v1/jobs/:id/stream`           | 任务日志流(SSE)    |
| **Users**      | `GET /api/v1/users/current`             | 当前用户信息       |
|                | `PUT /api/v1/users/password`            | 修改密码           |

## Configuration

### Environment Variables

```bash
# .env.local
# API 配置
CROUPIER_API_URL=http://localhost:18780
CROUPIER_WS_URL=ws://localhost:18780

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
      target: 'http://localhost:18780',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
    '/ws': {
      target: 'ws://localhost:18780',
      ws: true,
    },
  },
};
```

## Development Guide

### Project Structure

```
src/
├── components/              # 通用组件
│   ├── WorkspaceRenderer/   # Workspace 渲染器（核心）
│   │   ├── index.tsx        # 主渲染器
│   │   ├── TabsLayout.tsx   # Tabs 布局
│   │   └── renderers/       # 各类布局渲染器
│   │       ├── FormDetailRenderer.tsx  # 表单-详情
│   │       ├── ListRenderer.tsx        # 列表
│   │       ├── FormRenderer.tsx        # 表单
│   │       └── DetailRenderer.tsx      # 详情
│   ├── JSONSchemaEditor/    # Schema 编辑器
│   └── ...
├── pages/                   # 页面组件
│   ├── Workspaces/          # Workspace 管理
│   │   ├── List.tsx         # Workspace 列表
│   │   └── Detail.tsx       # Workspace 详情（使用 WorkspaceRenderer）
│   ├── WorkspaceEditor/     # 可视化编排器（核心）
│   │   ├── index.tsx        # 编排器主页面
│   │   └── components/      # 编排器组件
│   │       ├── FunctionList.tsx      # 函数列表
│   │       ├── LayoutDesigner.tsx    # 布局设计器
│   │       ├── TabEditor.tsx         # Tab 编辑器
│   │       ├── ConfigPreview.tsx     # 实时预览
│   │       └── LayoutConfigs/        # 布局配置组件
│   ├── Analytics/           # 数据分析
│   └── ...
├── services/                # API 服务
│   ├── workspaceConfig.ts   # Workspace 配置服务（核心）
│   ├── api.ts               # 函数调用服务
│   └── ...
├── types/                   # TypeScript 类型
│   ├── workspace.ts         # Workspace 类型定义（核心）
│   └── ...
├── hooks/                   # 自定义 Hooks
│   └── useFunctionInvoke/   # 函数调用 Hook
└── utils/                   # 工具函数
```

### Core Types

```typescript
// src/types/workspace.ts

// Workspace 配置
interface WorkspaceConfig {
  objectKey: string; // 对象标识，如 "player"
  title: string; // 显示标题
  layout: WorkspaceLayout; // 布局配置
}

// Workspace 布局
interface WorkspaceLayout {
  type: 'tabs'; // 目前只支持 tabs
  tabs: TabConfig[]; // Tab 配置列表
}

// Tab 配置
interface TabConfig {
  key: string; // Tab 唯一标识
  title: string; // Tab 标题
  icon?: string; // Tab 图标
  functions: string[]; // 使用的函数 ID 列表
  layout: TabLayout; // Tab 内的布局
}

// Tab 布局类型
type TabLayout =
  | FormDetailLayout // 表单-详情布局
  | ListLayout // 列表布局
  | FormLayout // 表单布局
  | DetailLayout; // 详情布局

// 表单-详情布局
interface FormDetailLayout {
  type: 'form-detail';
  queryFunction: string; // 查询函数 ID
  queryFields: FieldConfig[]; // 查询字段配置
  detailSections: Section[]; // 详情分区
  actions: ActionConfig[]; // 操作按钮
}

// 列表布局
interface ListLayout {
  type: 'list';
  listFunction: string; // 列表函数 ID
  columns: ColumnConfig[]; // 列配置
  rowActions?: ActionConfig[]; // 行操作
}
```

### Quick Start Guide

#### 1. 创建一个简单的 Workspace

```typescript
// 1. 定义配置
const playerConfig: WorkspaceConfig = {
  objectKey: 'player',
  title: '玩家管理',
  layout: {
    type: 'tabs',
    tabs: [
      {
        key: 'list',
        title: '玩家列表',
        functions: ['player.list'],
        layout: {
          type: 'list',
          listFunction: 'player.list',
          columns: [
            { key: 'playerId', title: '玩家ID', width: 150 },
            { key: 'nickname', title: '昵称', width: 150 },
            { key: 'level', title: '等级', width: 100 },
            { key: 'gold', title: '金币', width: 120, render: 'money' },
          ],
        },
      },
    ],
  },
};

// 2. 保存配置
await saveWorkspaceConfig(playerConfig);

// 3. 渲染界面
<WorkspaceRenderer config={playerConfig} />;
```

#### 2. 使用可视化编排器

```typescript
// 访问编排器页面
// /workspace-editor/player

// 操作流程：
// 1. 从左侧函数列表拖拽函数到布局设计器
// 2. 配置 Tab 标题、图标
// 3. 选择布局类型（list/form-detail/form/detail）
// 4. 配置布局详情（列、字段、操作等）
// 5. 右侧实时预览效果
// 6. 点击保存按钮保存配置

// 保存后访问 Workspace 页面即可看到效果
// /console/player
```

#### 3. 扩展新的布局类型

```typescript
// 1. 定义布局类型
interface CustomLayout {
  type: 'custom';
  customField: string;
}

// 2. 创建渲染器
// src/components/WorkspaceRenderer/renderers/CustomRenderer.tsx
export default function CustomRenderer({ layout }: { layout: CustomLayout }) {
  return <div>自定义布局: {layout.customField}</div>;
}

// 3. 注册渲染器
// src/components/WorkspaceRenderer/TabContentRenderer.tsx
function renderLayout(layout: TabLayout) {
  switch (layout.type) {
    case 'custom':
      return <CustomRenderer layout={layout} />;
    // ... 其他类型
  }
}

// 4. 在编排器中添加配置组件
// src/pages/WorkspaceEditor/components/LayoutConfigs/CustomLayoutConfig.tsx
```

## Implementation Roadmap

### Phase 1: 基础架构（Week 1）

**目标**：完成类型定义、配置服务、Layout Engine 核心

- [x] 定义 WorkspaceConfig 类型系统
- [x] 实现配置加载和保存服务
- [x] 实现 WorkspaceRenderer 组件
- [x] 实现 TabsLayout 组件
- [x] 配置缓存机制

**交付物**：可以根据配置渲染简单的 Tabs 布局

### Phase 2: Layout Engine（Week 2）

**目标**：完成所有渲染器、改造现有 Workspace、开始编排工具

- [ ] 实现 FormDetailRenderer（表单-详情布局）
- [ ] 实现 ListRenderer（列表布局）
- [ ] 实现 FormRenderer（表单布局）
- [ ] 实现 DetailRenderer（详情布局）
- [ ] 改造现有 Workspace Detail 页面
- [ ] 创建 WorkspaceEditor 页面框架
- [ ] 实现 FunctionList 组件

**交付物**：完整的渲染器 + 编排器基础框架

### Phase 3: 可视化编排工具（Week 3）

**目标**：完成可视化编排工具的核心功能

- [ ] 实现 LayoutDesigner 组件
- [ ] 实现 TabEditor 组件
- [ ] 实现布局配置组件（List/FormDetail/Form/Detail）
- [ ] 实现 ConfigPreview 实时预览
- [ ] 实现配置模板功能
- [ ] 集成拖拽功能

**交付物**：完整的可视化编排工具

### Phase 4: 测试与优化（Week 4）

**目标**：完善功能、测试、优化、编写文档

- [ ] 编写测试用例（目标覆盖率 >60%）
- [ ] 手动测试所有功能
- [ ] 性能测试和优化
- [ ] UI/UX 优化
- [ ] 编写用户文档
- [ ] 编写开发文档
- [ ] 准备演示 Demo

**交付物**：稳定的系统 + 完整的文档

### 详细任务清单

查看详细的实施计划：

- [总体 TODO](./TODO.md) - 项目概况和时间规划
- [Week 1 TODO](./TODO_WEEK1.md) - 基础架构任务
- [Week 2 TODO](./TODO_WEEK2.md) - Layout Engine 任务
- [Week 3 TODO](./TODO_WEEK3.md) - 可视化编排工具任务
- [Week 4 TODO](./TODO_WEEK4.md) - 测试和文档任务
- [架构设计文档](./ARCHITECTURE_DESIGN.md) - 完整的架构设计
- [文档索引](./DOCS_INDEX.md) - 所有文档导航

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

### Nginx Configuration

```nginx
# nginx.conf
server {
    listen 80;
    server_name dashboard.croupier.io;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://croupier-server:18780;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket 支持
    location /ws {
        proxy_pass http://croupier-server:18780;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
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
    metadata:
      labels:
        app: croupier-dashboard
    spec:
      containers:
        - name: dashboard
          image: croupier/dashboard:latest
          ports:
            - containerPort: 80
          env:
            - name: CROUPIER_API_URL
              value: 'http://croupier-server:18780'
          resources:
            requests:
              memory: '256Mi'
              cpu: '100m'
            limits:
              memory: '512Mi'
              cpu: '500m'
---
apiVersion: v1
kind: Service
metadata:
  name: croupier-dashboard
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 80
  selector:
    app: croupier-dashboard
```

### Production Checklist

- [ ] 更新环境变量配置
- [ ] 配置 CDN 加速静态资源
- [ ] 启用 Gzip 压缩
- [ ] 配置 CSP 策略
- [ ] 设置错误监控（Sentry）
- [ ] 配置访问日志
- [ ] 启用 HTTPS
- [ ] 配置缓存策略
- [ ] 配置 Redis 缓存（Workspace 配置）
- [ ] 配置 PostgreSQL（配置持久化）

## Performance Optimization

### Bundle Analysis

```bash
# 分析打包体积
pnpm analyze

# 启用 gzip 压缩
pnpm build:gzip
```

### Workspace 性能优化

1. **配置缓存**：使用 Redis 缓存 WorkspaceConfig，减少数据库查询
2. **懒加载渲染器**：按需加载布局渲染器组件
3. **虚拟滚动**：列表布局使用虚拟滚动处理大数据
4. **React.memo**：缓存渲染器组件，避免不必要的重渲染
5. **配置预加载**：在路由切换前预加载配置

### Best Practices

1. **路由懒加载**：使用 `dynamic` 导入减少首屏加载
2. **组件缓存**：合理使用 `React.memo`
3. **虚拟滚动**：大数据列表使用虚拟滚动
4. **防抖节流**：搜索输入等场景使用防抖
5. **图片优化**：使用 WebP 格式，配置懒加载

## FAQ

### 关于 Workspace 编排

**Q: Workspace 和传统 CRUD 页面有什么区别？**

A: Workspace 是函数编排系统，不是简单的 CRUD 生成器。它允许你将多个函数组合成一个完整的管理界面，支持多种布局类型，提供更灵活的界面设计能力。

**Q: 如何快速创建一个 Workspace？**

A: 有两种方式：

1. 使用可视化编排器：访问 `/workspace-editor/:objectKey`，通过拖拽和配置创建
2. 直接编写配置：创建 WorkspaceConfig JSON，调用 API 保存

**Q: 支持哪些布局类型？**

A: 目前支持：

- **Tabs 布局**：多标签页组织
- **FormDetail 布局**：先查询，再显示详情和操作
- **List 布局**：数据列表展示
- **Form 布局**：表单提交
- **Detail 布局**：详情展示

**Q: 如何扩展新的布局类型？**

A: 参考 [Quick Start Guide](#quick-start-guide) 中的"扩展新的布局类型"部分。

### 关于函数注册

**Q: SDK 需要提供哪些信息？**

A: SDK 只需要提供函数元数据（FunctionDescriptor）：

- 函数 ID（如 `player.getInfo`）
- 实体名称（如 `player`）
- 操作类型（如 `query`）
- 输入输出 Schema（OpenAPI 3.0 格式）
- 显示名称（多语言）

**Q: UI 配置应该在哪里管理？**

A: UI 配置（布局、字段、操作等）应该在 Dashboard 中管理，不应该在 SDK 中定义。这是职责分离的核心原则。

### 关于配置管理

**Q: 配置存储在哪里？**

A: WorkspaceConfig 存储在配置中心（PostgreSQL），并通过 Redis 缓存提升性能。

**Q: 配置可以版本管理吗？**

A: 目前版本（Phase 1-4）暂不支持配置版本管理，这是后续增强功能。

**Q: 如何备份和恢复配置？**

A: 可以通过 API 导出配置 JSON，保存到文件系统，需要时重新导入。

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

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**:

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

**Examples**:

```
feat(workspace): 添加 FormDetail 布局渲染器
fix(config): 修复配置缓存失效问题
docs(readme): 更新架构设计说明
refactor(renderer): 提取公共渲染逻辑
```

### Development Workflow

1. **创建分支**

   ```bash
   git checkout -b feature/workspace-editor
   ```

2. **开发功能**

   - 编写代码
   - 添加测试
   - 更新文档

3. **提交代码**

   ```bash
   git add .
   git commit -m "feat(workspace): 添加可视化编排器"
   ```

4. **推送并创建 PR**

   ```bash
   git push origin feature/workspace-editor
   # 在 GitHub 上创建 Pull Request
   ```

5. **代码审查**
   - 等待审查反馈
   - 根据反馈修改
   - 合并到主分支

### Issue Reporting

报告 Bug 时请提供：

- 操作系统和浏览器版本
- 重现步骤
- 预期行为和实际行为
- 相关的截图或错误日志
- 相关的配置文件（如 WorkspaceConfig）

**Bug Report Template**:

```markdown
## 环境信息

- OS: Windows 11 / macOS 14 / Ubuntu 22.04
- Browser: Chrome 120 / Firefox 121 / Safari 17
- Dashboard Version: v1.0.0

## 重现步骤

1. 访问 /workspace-editor/player
2. 拖拽函数到布局设计器
3. 点击保存按钮

## 预期行为

配置应该保存成功

## 实际行为

显示错误提示：配置保存失败

## 错误日志
```

Error: Failed to save config at saveWorkspaceConfig (workspaceConfig.ts:45)

````

## 截图
[附上截图]

## 相关配置
```json
{
  "objectKey": "player",
  "title": "玩家管理",
  ...
}
````

```

## License

本项目采用 Apache License 2.0 许可证。详见 [LICENSE](https://github.com/cuihairu/croupier/blob/main/LICENSE) 文件。

## Support

- 📖 [文档中心](https://docs.croupier.io)
- 💬 [讨论区](https://github.com/cuihairu/croupier/discussions)
- 🐛 [问题反馈](https://github.com/cuihairu/croupier/issues)
- 📧 邮箱：support@croupier.io

## Acknowledgments

感谢以下开源项目：

- [React](https://react.dev/) - UI 框架
- [Umi Max](https://umijs.org/) - 应用框架
- [Ant Design](https://ant.design/) - 组件库
- [Pro Components](https://procomponents.ant.design/) - 高级组件
- [TypeScript](https://www.typescriptlang.org/) - 类型系统

## Related Projects

- [Croupier Server](https://github.com/cuihairu/croupier) - 游戏函数平台后端
- [Croupier SDK (Go)](https://github.com/cuihairu/croupier-sdk-go) - Go SDK
- [Croupier SDK (Java)](https://github.com/cuihairu/croupier-sdk-java) - Java SDK

---

**Built with ❤️ by the Croupier Team**
```
