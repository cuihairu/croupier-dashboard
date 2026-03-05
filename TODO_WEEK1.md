# Workspace 重构 TODO 清单

**项目**: Croupier Dashboard Workspace 重构 **开始日期**: 2026-03-06 **预计完成**: 4 周

---

## 📋 总览

### 目标

将 Workspace 从"函数调用工具"改造为"可视化编排的管理界面"

### 核心理念

- SDK 关注功能注册
- Dashboard 关注 UI 编排
- 配置存储在配置中心

### 完成标准

- [ ] 可以通过可视化工具编排 Workspace
- [ ] 配置可以保存和加载
- [ ] 根据配置自动渲染界面
- [ ] 支持至少 3 种布局类型

---

## 🎯 Phase 1: 基础架构（Week 1）

### 1.1 类型定义

#### 任务 1.1.1: 定义 WorkspaceConfig 类型

**文件**: `src/types/workspace.ts` **优先级**: P0（最高） **预计时间**: 2 小时

**详细步骤**:

```typescript
// 1. 创建文件
touch src/types/workspace.ts

// 2. 定义核心类型
export interface WorkspaceConfig {
  objectKey: string;
  title: string;
  description?: string;
  icon?: string;
  layout: WorkspaceLayout;
  permissions?: string[];
  meta?: WorkspaceMeta;
}

// 3. 定义布局类型
export interface WorkspaceLayout {
  type: 'tabs' | 'sections' | 'wizard' | 'dashboard';
  tabs?: TabConfig[];
  sections?: SectionConfig[];
}

// 4. 定义 Tab 配置
export interface TabConfig {
  key: string;
  title: string;
  icon?: string;
  functions: string[];
  layout: TabLayout;
}

// 5. 定义 Tab 内布局
export interface TabLayout {
  type: 'form-detail' | 'list' | 'form' | 'detail' | 'custom';
  // ... 详细字段见 ARCHITECTURE_DESIGN.md
}
```

**验收标准**:

- [ ] 类型定义完整
- [ ] TypeScript 编译通过
- [ ] 有完整的 JSDoc 注释

---

#### 任务 1.1.2: 定义 LayoutEngine 相关类型

**文件**: `src/types/layout.ts` **优先级**: P0 **预计时间**: 1 小时

**详细步骤**:

```typescript
// 1. 定义字段配置
export interface FieldConfig {
  key: string;
  label: string;
  type: 'input' | 'number' | 'select' | 'date' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
}

// 2. 定义列配置
export interface ColumnConfig {
  key: string;
  title: string;
  width?: number;
  render?: 'text' | 'status' | 'datetime' | 'tag' | 'money';
  renderConfig?: any;
}

// 3. 定义操作配置
export interface ActionConfig {
  key: string;
  label: string;
  icon?: string;
  function: string;
  type?: 'modal' | 'drawer' | 'navigate';
  fields?: FieldConfig[];
  confirm?: {
    title: string;
    content?: string;
  };
}

// 4. 定义详情区块配置
export interface DetailSection {
  title?: string;
  fields: DetailFieldConfig[];
}
```

**验收标准**:

- [ ] 类型定义完整
- [ ] 与 WorkspaceConfig 类型兼容
- [ ] 有完整的注释

---

### 1.2 配置服务

#### 任务 1.2.1: 实现配置加载服务

**文件**: `src/services/workspaceConfig.ts` **优先级**: P0 **预计时间**: 3 小时 **依赖**: 任务 1.1.1

**详细步骤**:

```typescript
// 1. 创建文件
touch src/services/workspaceConfig.ts

// 2. 实现加载函数
export async function loadWorkspaceConfig(
  objectKey: string
): Promise<WorkspaceConfig | null> {
  try {
    // 2.1 调用后端 API
    const response = await request<WorkspaceConfig>(
      `/api/v1/workspaces/${objectKey}/config`
    );
    return response;
  } catch (error) {
    // 2.2 如果配置不存在，返回 null
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

// 3. 实现保存函数
export async function saveWorkspaceConfig(
  config: WorkspaceConfig
): Promise<void> {
  await request(`/api/v1/workspaces/${config.objectKey}/config`, {
    method: 'PUT',
    data: config,
  });
}

// 4. 实现列表函数
export async function listWorkspaceConfigs(): Promise<WorkspaceConfig[]> {
  const response = await request<{ items: WorkspaceConfig[] }>(
    '/api/v1/workspaces/configs'
  );
  return response.items || [];
}

// 5. 实现删除函数
export async function deleteWorkspaceConfig(
  objectKey: string
): Promise<void> {
  await request(`/api/v1/workspaces/${objectKey}/config`, {
    method: 'DELETE',
  });
}
```

**验收标准**:

- [ ] 所有函数实现完整
- [ ] 错误处理完善
- [ ] 有单元测试（可选）

---

#### 任务 1.2.2: 实现配置缓存

**文件**: `src/services/workspaceConfig.ts` **优先级**: P1 **预计时间**: 2 小时 **依赖**: 任务 1.2.1

**详细步骤**:

```typescript
// 1. 添加缓存 Map
const configCache = new Map<string, WorkspaceConfig>();

// 2. 修改 loadWorkspaceConfig，添加缓存逻辑
export async function loadWorkspaceConfig(
  objectKey: string,
  useCache: boolean = true,
): Promise<WorkspaceConfig | null> {
  // 2.1 检查缓存
  if (useCache && configCache.has(objectKey)) {
    return configCache.get(objectKey)!;
  }

  // 2.2 加载配置
  const config = await fetchConfigFromAPI(objectKey);

  // 2.3 存入缓存
  if (config) {
    configCache.set(objectKey, config);
  }

  return config;
}

// 3. 添加清除缓存函数
export function clearConfigCache(objectKey?: string): void {
  if (objectKey) {
    configCache.delete(objectKey);
  } else {
    configCache.clear();
  }
}
```

**验收标准**:

- [ ] 缓存逻辑正确
- [ ] 支持强制刷新
- [ ] 支持清除缓存

---

### 1.3 Layout Engine 核心

#### 任务 1.3.1: 实现 WorkspaceRenderer 组件

**文件**: `src/components/WorkspaceRenderer/index.tsx` **优先级**: P0 **预计时间**: 4 小时 **依赖**: 任务 1.1.1, 1.2.1

**详细步骤**:

```typescript
// 1. 创建目录和文件
mkdir -p src/components/WorkspaceRenderer
touch src/components/WorkspaceRenderer/index.tsx

// 2. 实现组件框架
import React from 'react';
import { Spin, Result } from 'antd';
import type { WorkspaceConfig } from '@/types/workspace';
import TabsLayout from './layouts/TabsLayout';
import SectionsLayout from './layouts/SectionsLayout';

interface WorkspaceRendererProps {
  config: WorkspaceConfig;
}

export default function WorkspaceRenderer({ config }: WorkspaceRendererProps) {
  // 2.1 根据布局类型渲染
  switch (config.layout.type) {
    case 'tabs':
      return <TabsLayout config={config} />;
    case 'sections':
      return <SectionsLayout config={config} />;
    default:
      return (
        <Result
          status="warning"
          title="不支持的布局类型"
          subTitle={`布局类型 "${config.layout.type}" 暂未实现`}
        />
      );
  }
}

// 3. 导出
export { WorkspaceRenderer };
```

**验收标准**:

- [ ] 组件可以正常渲染
- [ ] 支持 tabs 和 sections 布局
- [ ] 错误处理完善

---

#### 任务 1.3.2: 实现 TabsLayout 组件

**文件**: `src/components/WorkspaceRenderer/layouts/TabsLayout.tsx` **优先级**: P0 **预计时间**: 4 小时 **依赖**: 任务 1.3.1

**详细步骤**:

```typescript
// 1. 创建文件
mkdir -p src/components/WorkspaceRenderer/layouts
touch src/components/WorkspaceRenderer/layouts/TabsLayout.tsx

// 2. 实现组件
import React, { useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Tabs } from 'antd';
import type { WorkspaceConfig } from '@/types/workspace';
import TabContentRenderer from '../renderers/TabContentRenderer';

interface TabsLayoutProps {
  config: WorkspaceConfig;
}

export default function TabsLayout({ config }: TabsLayoutProps) {
  const [activeTab, setActiveTab] = useState(config.layout.tabs?.[0]?.key);

  // 2.1 生成 Tab 项
  const tabItems = config.layout.tabs?.map(tab => ({
    key: tab.key,
    label: tab.title,
    icon: tab.icon ? getIcon(tab.icon) : null,
    children: <TabContentRenderer tab={tab} />,
  }));

  return (
    <PageContainer title={config.title}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />
    </PageContainer>
  );
}

// 3. 辅助函数：获取图标
function getIcon(iconName: string) {
  const Icons = require('@ant-design/icons');
  const IconComponent = Icons[iconName];
  return IconComponent ? <IconComponent /> : null;
}
```

**验收标准**:

- [ ] Tab 可以正常切换
- [ ] 图标显示正确
- [ ] 内容渲染正确

---

#### 任务 1.3.3: 实现 TabContentRenderer 组件

**文件**: `src/components/WorkspaceRenderer/renderers/TabContentRenderer.tsx` **优先级**: P0 **预计时间**: 6 小时 **依赖**: 任务 1.3.2

**详细步骤**:

```typescript
// 1. 创建文件
mkdir -p src/components/WorkspaceRenderer/renderers
touch src/components/WorkspaceRenderer/renderers/TabContentRenderer.tsx

// 2. 实现组件
import React from 'react';
import { Result } from 'antd';
import type { TabConfig } from '@/types/workspace';
import FormDetailRenderer from './FormDetailRenderer';
import ListRenderer from './ListRenderer';
import FormRenderer from './FormRenderer';
import DetailRenderer from './DetailRenderer';

interface TabContentRendererProps {
  tab: TabConfig;
}

export default function TabContentRenderer({ tab }: TabContentRendererProps) {
  // 2.1 根据布局类型渲染
  switch (tab.layout.type) {
    case 'form-detail':
      return <FormDetailRenderer layout={tab.layout} />;
    case 'list':
      return <ListRenderer layout={tab.layout} />;
    case 'form':
      return <FormRenderer layout={tab.layout} />;
    case 'detail':
      return <DetailRenderer layout={tab.layout} />;
    default:
      return (
        <Result
          status="warning"
          title="不支持的布局类型"
          subTitle={`布局类型 "${tab.layout.type}" 暂未实现`}
        />
      );
  }
}
```

**验收标准**:

- [ ] 支持所有布局类型
- [ ] 渲染正确
- [ ] 错误处理完善

---

## 📊 进度跟踪

### Week 1 任务清单

- [ ] 1.1.1 定义 WorkspaceConfig 类型
- [ ] 1.1.2 定义 LayoutEngine 相关类型
- [ ] 1.2.1 实现配置加载服务
- [ ] 1.2.2 实现配置缓存
- [ ] 1.3.1 实现 WorkspaceRenderer 组件
- [ ] 1.3.2 实现 TabsLayout 组件
- [ ] 1.3.3 实现 TabContentRenderer 组件

### 完成度统计

- 总任务数: 7
- 已完成: 0
- 进行中: 0
- 未开始: 7

---

## 📝 注意事项

1. **按顺序执行** - 任务有依赖关系，必须按顺序完成
2. **验收标准** - 每个任务完成后必须通过验收标准
3. **代码质量** - 保持代码整洁，添加必要的注释
4. **测试** - 关键功能需要测试
5. **文档** - 复杂逻辑需要文档说明

---

## 🔗 相关文档

- [架构设计文档](./ARCHITECTURE_DESIGN.md)
- [函数描述符分析](./FUNCTION_DESCRIPTOR_ANALYSIS.md)
- [重构计划](./REFACTOR_PLAN.md)
