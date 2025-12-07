# Croupier Dashboard

React/Umi Max + Ant Design Pro + X-Render 管理界面，为 Croupier 控制面提供函数调用、实体管理、审批流和审计可视化。

- 主仓库（Server/Agent）：https://github.com/cuihairu/croupier
- Dashboard 仓库： https://github.com/cuihairu/croupier-dashboard（本目录）

## 功能特性
- **Schema 驱动 UI**：通过 JSON Schema / X-Render 自动生成函数调用与实体管理表单，支持动态显隐、条件必填、风险提示。
- **函数执行控制台**：支持 `lb/broadcast/targeted/hash` 等路由策略、幂等键与长任务流式日志展示。
- **审批与审计**：集成双人审批、操作审计、登录日志，配合 IP 属地/风控提示。
- **实体管理（Entities）**：基于 ProTable + FormRender 的 CRUD 工作台，可实时预览 JSON Schema 渲染效果。
- **实时态势**：作业进度、Agent/函数注册表、包管理、系统告警等模块化视图。

## 快速开始
### 依赖
- Node.js 18+（推荐 20/22）
- pnpm 9（可改用 npm/yarn）

### 安装
```bash
pnpm install           # 安装所有依赖
```

### 开发模式
```bash
pnpm dev               # http://localhost:8000，代理 /api -> http://localhost:8080
```
- 默认账号：`admin` / `admin123`
- Dev proxy 逻辑见 `config/proxy.ts`，可按需修改 API 地址。

### 生产构建
```bash
pnpm build             # 输出 dist/
```
- `dist/` 可直接挂载到 `croupier-server` 的静态目录（服务器会优先服务 `web/dist` 或自定义路径）。

### 质量检查
```bash
pnpm lint
pnpm test
```

## X-Render 指南
### 1. 函数表单
- `FormRender` 根据后端函数的 JSON Schema 自动生成 UI，支持复杂对象、数组、枚举、日期类型。
- 通过 `uiSchema`、`required_if`、`show_if` 实现条件校验和动态显隐。
- `hooks/useFunctionInvoke` 封装了函数调用、路由策略、进度轮询与 SSE 日志。

### 2. 实体管理器
- `Entities` 页面使用 ProTable + FormRender 实现 CRUD，可从服务端拉取 Schema 并预览渲染效果。
- 支持批量操作、拖拽排序、自定义列展示；常用于管理白名单、道具、礼包等结构化实体。

### 3. 最佳实践
- 在 Schema 中提供风险等级（如 `risk: high`）与 `ui:widget` 以统一 UI 风格。
- 使用 `ui:meta` 配置字段提示/占位符，与后台的审批策略保持一致。
- 需要快速验证 Schema 时可在 Dev Server 中打开 debug 面板查看实时渲染结果。

## 与 Server 的对接
- 登录：`POST /api/v1/auth/login` → `{ token, user }`
- 用户信息：`GET /api/v1/users/current`
- 函数/实体/审批等接口详见服务端 OpenAPI/Proto；Dashboard 仅做 UI 层封装。
- Agent/函数注册表、作业进度、审批流等依赖 Server 提供的 gRPC/HTTP API。

## 部署建议
1. 生产环境使用 `pnpm build` 生成 `dist/`，由 Nginx 或 Croupier Server 静态托管。
2. 配置 `.env` 或 `config/proxy.ts` 中的 API 域名、TLS、SSE/WebSocket 地址。
3. 若启用 IP 属地、审批、审计等功能，请确保 Server 已正确配置相应服务（Redis、ClickHouse、GeoIP）。

欢迎提交 Issue/PR，或在主仓库讨论更多 UI/Schema 能力。
