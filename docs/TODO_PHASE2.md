# Workspace Phase 2 实施计划

## 概述

Phase 2 的目标是在 Phase 1 基础架构之上，增强 Workspace 的功能和易用性。

## 时间规划

- **Week 5-6**: 后端 API 集成和实际应用测试
- **Week 7-8**: 更多布局类型和配置增强
- **Week 9-10**: 性能优化和测试完善

---

## Week 5: 后端 API 集成（第一部分）

### 5.1 配置管理 API 实现

**目标**: 实现配置的后端存储和管理

#### 5.1.1 后端 API 设计

**文件**: `docs/API_DESIGN.md`

- [ ] 设计配置管理 API 接口
  - `GET /api/v1/workspaces/:objectKey/config` - 获取配置
  - `PUT /api/v1/workspaces/:objectKey/config` - 保存配置
  - `DELETE /api/v1/workspaces/:objectKey/config` - 删除配置
  - `GET /api/v1/workspaces/configs` - 获取配置列表
  - `POST /api/v1/workspaces/:objectKey/clone` - 克隆配置
  - `GET /api/v1/workspaces/:objectKey/export` - 导出配置
  - `POST /api/v1/workspaces/import` - 导入配置

#### 5.1.2 前端 API 客户端

**文件**: `src/services/api/workspace.ts`

```typescript
// 配置管理 API 客户端
export async function getWorkspaceConfig(objectKey: string): Promise<WorkspaceConfig>;
export async function saveWorkspaceConfig(config: WorkspaceConfig): Promise<WorkspaceConfig>;
export async function deleteWorkspaceConfig(objectKey: string): Promise<void>;
export async function listWorkspaceConfigs(): Promise<WorkspaceConfig[]>;
export async function cloneWorkspaceConfig(
  sourceKey: string,
  targetKey: string,
  targetTitle: string,
): Promise<WorkspaceConfig>;
export async function exportWorkspaceConfig(objectKey: string): Promise<string>;
export async function importWorkspaceConfig(configJson: string): Promise<WorkspaceConfig>;
```

- [ ] 实现 API 客户端函数
- [ ] 添加错误处理
- [ ] 添加请求重试机制
- [ ] 添加请求缓存

#### 5.1.3 更新配置服务

**文件**: `src/services/workspaceConfig.ts`

- [ ] 将 mock 实现替换为真实 API 调用
- [ ] 保留缓存机制
- [ ] 添加离线支持（可选）
- [ ] 添加乐观更新

### 5.2 函数调用 API 集成

**目标**: 统一函数调用接口

#### 5.2.1 函数调用服务

**文件**: `src/services/functionInvoke.ts`

```typescript
// 函数调用服务
export async function invokeFunction(
  functionId: string,
  params: Record<string, any>,
  options?: {
    timeout?: number;
    signal?: AbortSignal;
  },
): Promise<any>;

// 批量调用
export async function invokeFunctions(
  calls: Array<{ functionId: string; params: Record<string, any> }>,
): Promise<any[]>;
```

- [ ] 实现函数调用服务
- [ ] 添加超时控制
- [ ] 添加取消支持
- [ ] 添加错误处理
- [ ] 添加调用日志

#### 5.2.2 更新渲染器

**文件**: `src/components/WorkspaceRenderer/renderers/*.tsx`

- [ ] 更新 FormDetailRenderer 使用新的调用服务
- [ ] 更新 ListRenderer 使用新的调用服务
- [ ] 更新 FormRenderer 使用新的调用服务
- [ ] 更新 DetailRenderer 使用新的调用服务
- [ ] 添加加载状态
- [ ] 添加错误处理

### 5.3 权限验证集成

**目标**: 实现权限控制

#### 5.3.1 权限服务

**文件**: `src/services/permission.ts`

```typescript
// 权限验证服务
export function hasPermission(permission: string): boolean;
export function hasAnyPermission(permissions: string[]): boolean;
export function hasAllPermissions(permissions: string[]): boolean;
export function filterByPermission<T extends { permissions?: string[] }>(items: T[]): T[];
```

- [ ] 实现权限验证函数
- [ ] 集成到 WorkspaceRenderer
- [ ] 集成到 TabsLayout
- [ ] 集成到操作按钮

#### 5.3.2 权限组件

**文件**: `src/components/Permission/index.tsx`

```typescript
// 权限控制组件
export function PermissionGuard({ permissions, children, fallback }: Props);
export function usePermission(permission: string): boolean;
export function usePermissions(permissions: string[]): boolean[];
```

- [ ] 实现权限组件
- [ ] 添加权限 Hook
- [ ] 添加权限装饰器

---

## Week 6: 实际应用测试和优化

### 6.1 创建示例 Workspace

**目标**: 创建真实的 Workspace 配置用于测试

#### 6.1.1 玩家管理 Workspace

**文件**: `config/workspaces/player.json`

- [ ] 创建玩家信息查询 Tab（FormDetail 布局）
- [ ] 创建玩家列表 Tab（List 布局）
- [ ] 创建玩家创建 Tab（Form 布局）
- [ ] 配置操作按钮（更新等级、封禁、解封等）
- [ ] 配置权限控制

#### 6.1.2 订单管理 Workspace

**文件**: `config/workspaces/order.json`

- [ ] 创建订单列表 Tab（List 布局）
- [ ] 创建订单详情 Tab（FormDetail 布局）
- [ ] 配置订单状态渲染
- [ ] 配置订单操作（退款、发货等）

#### 6.1.3 道具管理 Workspace

**文件**: `config/workspaces/item.json`

- [ ] 创建道具列表 Tab（List 布局）
- [ ] 创建道具发放 Tab（Form 布局）
- [ ] 创建道具回收 Tab（Form 布局）

### 6.2 集成测试

**目标**: 在真实环境中测试 Workspace

#### 6.2.1 功能测试

- [ ] 测试配置加载和保存
- [ ] 测试函数调用
- [ ] 测试权限控制
- [ ] 测试缓存机制
- [ ] 测试错误处理

#### 6.2.2 性能测试

- [ ] 测试大数据量列表渲染
- [ ] 测试复杂配置加载
- [ ] 测试并发函数调用
- [ ] 测试缓存效果

#### 6.2.3 用户体验测试

- [ ] 测试编排器易用性
- [ ] 测试实时预览效果
- [ ] 测试错误提示
- [ ] 收集用户反馈

### 6.3 Bug 修复和优化

**目标**: 修复测试中发现的问题

#### 6.3.1 Bug 修复

- [ ] 修复配置验证问题
- [ ] 修复渲染器 Bug
- [ ] 修复编排器 Bug
- [ ] 修复缓存问题

#### 6.3.2 性能优化

- [ ] 优化列表渲染性能
- [ ] 优化配置加载速度
- [ ] 优化缓存策略
- [ ] 减少不必要的重渲染

#### 6.3.3 用户体验优化

- [ ] 改进错误提示
- [ ] 添加加载动画
- [ ] 优化交互流程
- [ ] 添加快捷键

---

## Week 7: 更多布局类型

### 7.1 Wizard 布局

**目标**: 实现向导式流程布局

#### 7.1.1 类型定义

**文件**: `src/types/workspace.ts`

```typescript
export interface WizardLayout {
  type: 'wizard';
  steps: Array<{
    key: string;
    title: string;
    description?: string;
    layout: FormLayout | DetailLayout;
  }>;
  submitFunction?: string;
  onStepChange?: string;
}
```

- [ ] 添加 WizardLayout 类型定义
- [ ] 添加步骤配置类型
- [ ] 更新 TabLayout 联合类型

#### 7.1.2 渲染器实现

**文件**: `src/components/WorkspaceRenderer/renderers/WizardRenderer.tsx`

```typescript
export default function WizardRenderer({ layout, objectKey, context }: Props) {
  // 实现向导式流程
  // - 步骤导航
  // - 步骤内容渲染
  // - 上一步/下一步
  // - 提交
}
```

- [ ] 实现 WizardRenderer 组件
- [ ] 实现步骤导航
- [ ] 实现步骤验证
- [ ] 实现数据收集
- [ ] 实现提交逻辑

#### 7.1.3 编排器支持

**文件**: `src/pages/WorkspaceEditor/components/TabEditor.tsx`

- [ ] 添加 Wizard 布局配置界面
- [ ] 支持添加/删除步骤
- [ ] 支持配置步骤内容
- [ ] 实时预览支持

### 7.2 Dashboard 布局

**目标**: 实现仪表盘布局

#### 7.2.1 类型定义

**文件**: `src/types/workspace.ts`

```typescript
export interface DashboardLayout {
  type: 'dashboard';
  widgets: Array<{
    key: string;
    title: string;
    type: 'stat' | 'chart' | 'table' | 'custom';
    span: number; // 栅格宽度
    dataFunction?: string;
    config?: Record<string, any>;
  }>;
  refreshInterval?: number;
}
```

- [ ] 添加 DashboardLayout 类型定义
- [ ] 添加 Widget 配置类型
- [ ] 更新 TabLayout 联合类型

#### 7.2.2 渲染器实现

**文件**: `src/components/WorkspaceRenderer/renderers/DashboardRenderer.tsx`

```typescript
export default function DashboardRenderer({ layout, objectKey, context }: Props) {
  // 实现仪表盘布局
  // - 栅格布局
  // - Widget 渲染
  // - 自动刷新
}
```

- [ ] 实现 DashboardRenderer 组件
- [ ] 实现栅格布局
- [ ] 实现 Widget 渲染器
  - StatWidget（统计数字）
  - ChartWidget（图表）
  - TableWidget（表格）
  - CustomWidget（自定义）
- [ ] 实现自动刷新

#### 7.2.3 编排器支持

**文件**: `src/pages/WorkspaceEditor/components/TabEditor.tsx`

- [ ] 添加 Dashboard 布局配置界面
- [ ] 支持添加/删除 Widget
- [ ] 支持配置 Widget 类型和参数
- [ ] 支持拖拽调整 Widget 位置

### 7.3 Sections 布局

**目标**: 实现分区布局

#### 7.3.1 类型定义

**文件**: `src/types/workspace.ts`

```typescript
export interface SectionsLayout {
  type: 'sections';
  sections: Array<{
    key: string;
    title: string;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    layout: FormDetailLayout | ListLayout | FormLayout | DetailLayout;
  }>;
}
```

- [ ] 添加 SectionsLayout 类型定义
- [ ] 添加 Section 配置类型
- [ ] 更新 TabLayout 联合类型

#### 7.3.2 渲染器实现

**文件**: `src/components/WorkspaceRenderer/renderers/SectionsRenderer.tsx`

```typescript
export default function SectionsRenderer({ layout, objectKey, context }: Props) {
  // 实现分区布局
  // - 分区标题
  // - 折叠/展开
  // - 分区内容渲染
}
```

- [ ] 实现 SectionsRenderer 组件
- [ ] 实现分区渲染
- [ ] 实现折叠/展开功能
- [ ] 实现分区内容渲染

#### 7.3.3 编排器支持

**文件**: `src/pages/WorkspaceEditor/components/TabEditor.tsx`

- [ ] 添加 Sections 布局配置界面
- [ ] 支持添加/删除 Section
- [ ] 支持配置 Section 内容
- [ ] 实时预览支持

---

## Week 8: 配置增强

### 8.1 配置版本管理

**目标**: 实现配置的版本控制

#### 8.1.1 版本数据模型

**文件**: `src/types/workspace.ts`

```typescript
export interface WorkspaceConfigVersion {
  version: number;
  config: WorkspaceConfig;
  createdAt: string;
  createdBy: string;
  comment?: string;
}

export interface WorkspaceConfigHistory {
  objectKey: string;
  versions: WorkspaceConfigVersion[];
  currentVersion: number;
}
```

- [ ] 添加版本相关类型定义
- [ ] 更新 WorkspaceConfig 添加版本字段

#### 8.1.2 版本管理服务

**文件**: `src/services/workspaceVersion.ts`

```typescript
// 版本管理服务
export async function getVersionHistory(objectKey: string): Promise<WorkspaceConfigHistory>;
export async function getVersion(objectKey: string, version: number): Promise<WorkspaceConfig>;
export async function saveVersion(
  objectKey: string,
  config: WorkspaceConfig,
  comment?: string,
): Promise<WorkspaceConfigVersion>;
export async function rollbackToVersion(
  objectKey: string,
  version: number,
): Promise<WorkspaceConfig>;
export async function compareVersions(objectKey: string, v1: number, v2: number): Promise<any>;
```

- [ ] 实现版本管理服务
- [ ] 实现版本历史查询
- [ ] 实现版本回滚
- [ ] 实现版本对比

#### 8.1.3 版本管理 UI

**文件**: `src/pages/WorkspaceEditor/components/VersionHistory.tsx`

- [ ] 实现版本历史列表
- [ ] 实现版本详情查看
- [ ] 实现版本对比界面
- [ ] 实现版本回滚功能

### 8.2 配置模板

**目标**: 提供常用配置模板

#### 8.2.1 模板定义

**文件**: `src/templates/workspace/index.ts`

```typescript
export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  preview?: string;
  config: Partial<WorkspaceConfig>;
}

export const templates: WorkspaceTemplate[] = [
  // 基础列表模板
  // 表单-详情模板
  // 完整管理模板
  // 向导流程模板
  // 仪表盘模板
];
```

- [ ] 定义模板数据结构
- [ ] 创建基础模板
  - 基础列表模板
  - 表单-详情模板
  - 完整管理模板
  - 向导流程模板
  - 仪表盘模板

#### 8.2.2 模板应用

**文件**: `src/pages/WorkspaceEditor/components/TemplateSelector.tsx`

- [ ] 实现模板选择器
- [ ] 实现模板预览
- [ ] 实现模板应用
- [ ] 支持模板自定义

#### 8.2.3 模板市场（可选）

**文件**: `src/pages/TemplateMarket/index.tsx`

- [ ] 实现模板市场页面
- [ ] 支持模板搜索
- [ ] 支持模板下载
- [ ] 支持模板分享

### 8.3 配置校验增强

**目标**: 增强配置验证功能

#### 8.3.1 高级验证规则

**文件**: `src/services/workspaceConfig.ts`

- [ ] 添加函数存在性验证
- [ ] 添加字段类型验证
- [ ] 添加权限配置验证
- [ ] 添加循环依赖检测

#### 8.3.2 验证错误提示

**文件**: `src/pages/WorkspaceEditor/components/ValidationPanel.tsx`

- [ ] 实现验证结果面板
- [ ] 显示错误位置
- [ ] 提供修复建议
- [ ] 支持一键修复

---

## Week 9-10: 性能优化和测试完善

### 9.1 性能优化

#### 9.1.1 虚拟滚动

**文件**: `src/components/WorkspaceRenderer/renderers/ListRenderer.tsx`

- [ ] 集成 react-window
- [ ] 实现虚拟滚动列表
- [ ] 优化大数据量渲染
- [ ] 测试性能提升

#### 9.1.2 懒加载

**文件**: `src/components/WorkspaceRenderer/index.tsx`

- [ ] 实现渲染器懒加载
- [ ] 实现配置懒加载
- [ ] 实现数据懒加载
- [ ] 优化首屏加载时间

#### 9.1.3 缓存优化

**文件**: `src/services/workspaceConfig.ts`

- [ ] 优化缓存策略
- [ ] 实现多级缓存
- [ ] 实现缓存预热
- [ ] 实现缓存失效策略

### 9.2 测试完善

#### 9.2.1 单元测试

**目标**: 提升测试覆盖率到 80%

- [ ] 补充类型定义测试
- [ ] 补充配置服务测试
- [ ] 补充渲染器测试
- [ ] 补充编排器测试

#### 9.2.2 集成测试

**文件**: `tests/integration/workspace.test.ts`

- [ ] 测试完整工作流
- [ ] 测试配置加载和保存
- [ ] 测试函数调用
- [ ] 测试权限控制

#### 9.2.3 E2E 测试

**文件**: `tests/e2e/workspace.spec.ts`

- [ ] 测试编排器操作
- [ ] 测试配置应用
- [ ] 测试用户交互
- [ ] 测试错误场景

### 9.3 文档更新

#### 9.3.1 更新现有文档

- [ ] 更新用户指南
- [ ] 更新开发指南
- [ ] 更新 API 文档
- [ ] 更新演示指南

#### 9.3.2 新增文档

- [ ] 创建性能优化指南
- [ ] 创建测试指南
- [ ] 创建故障排查指南
- [ ] 创建最佳实践文档

---

## 验收标准

### Week 5-6 验收

- [ ] 配置可以保存到后端
- [ ] 函数调用正常工作
- [ ] 权限控制生效
- [ ] 至少 3 个真实 Workspace 可用
- [ ] 性能测试通过

### Week 7-8 验收

- [ ] 3 种新布局类型可用
- [ ] 配置版本管理可用
- [ ] 配置模板可用
- [ ] 配置验证增强完成

### Week 9-10 验收

- [ ] 性能优化完成
- [ ] 测试覆盖率达到 80%
- [ ] E2E 测试通过
- [ ] 文档更新完成

---

## 风险和应对

### 风险 1: 后端 API 延期

**应对**:

- 继续使用 mock 数据
- 提前定义 API 接口
- 前后端并行开发

### 风险 2: 性能问题

**应对**:

- 提前进行性能测试
- 分阶段优化
- 使用成熟的优化方案

### 风险 3: 用户反馈不佳

**应对**:

- 早期收集用户反馈
- 快速迭代改进
- 提供详细的帮助文档

---

**创建时间**: 2026-03-06 **预计完成**: 2026-04-03 (4 周)
