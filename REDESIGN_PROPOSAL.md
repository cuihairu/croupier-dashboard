# Croupier Dashboard 重新设计方案

**设计者**: Claude Opus 4.6 **日期**: 2026-03-05 **目标**: 实现真正的"函数注册即可用"的动态管理后台

---

## 一、核心问题诊断

### 1.1 现有方案的根本问题

**问题 1: UI 生成机制不完整**

- 现状: 只能生成表单，列表/详情/仪表盘需手写
- 根因: 缺少完整的页面 Schema 规范
- 影响: 无法实现真正的动态生成

**问题 2: 路由系统设计失败**

- 现状: 依赖 Umi 静态路由，需手动配置 85 个路由
- 根因: 架构选型错误，Umi 不适合完全动态的场景
- 影响: 发布流程繁琐，无法热更新

**问题 3: 元数据驱动不彻底**

- 现状: descriptor 只包含函数信息，缺少页面配置
- 根因: 元数据设计不完整
- 影响: 仍需大量手写代码

**问题 4: 配置管理缺失**

- 现状: UI 配置散落在各处，无统一管理
- 根因: 缺少配置中心
- 影响: 配置难以维护和复用

---

## 二、全新设计方案

### 2.1 核心设计理念

```
函数注册 → 元数据生成 → 页面自动生成 → 立即可用
```

**关键原则**:

1. **完全元数据驱动**: 所有页面配置都来自元数据
2. **零手写代码**: 不需要写任何页面组件
3. **动态路由**: 运行时动态注册，无需重启
4. **配置即代码**: 所有配置可导入导出
5. **渐进增强**: 支持从简单到复杂的定制

### 2.2 架构对比

| 维度         | 现有方案         | 新方案                 |
| ------------ | ---------------- | ---------------------- |
| **路由**     | Umi 静态路由     | React Router 动态路由  |
| **页面生成** | 部分动态(仅表单) | 完全动态(所有页面类型) |
| **配置管理** | 分散             | 统一配置中心           |
| **发布流程** | 需重启           | 热更新                 |
| **元数据**   | descriptor       | PageConfig + UIConfig  |
| **UI 框架**  | Umi Max          | Next.js / Vite         |

---

## 三、技术架构设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                   Browser                            │
├─────────────────────────────────────────────────────┤
│  React App (Next.js/Vite)                           │
│  ├─ Dynamic Router (React Router v6)                │
│  ├─ Page Generator (根据PageConfig生成页面)         │
│  ├─ Component Registry (组件注册表)                 │
│  └─ Config Manager (配置管理器)                     │
├─────────────────────────────────────────────────────┤
│  API Layer                                           │
│  ├─ /api/pages (获取页面配置)                       │
│  ├─ /api/functions (函数调用)                       │
│  └─ /api/config (配置管理)                          │
├─────────────────────────────────────────────────────┤
│  Backend (Croupier Server)                          │
│  ├─ Function Registry (函数注册表)                  │
│  ├─ Page Config Store (页面配置存储)                │
│  └─ Metadata Generator (元数据生成器)               │
└─────────────────────────────────────────────────────┘
```

### 3.2 核心模块设计

#### 3.2.1 元数据系统

**PageConfig (页面配置)**:

```typescript
interface PageConfig {
  id: string; // 页面ID
  type: 'list' | 'detail' | 'form' | 'dashboard' | 'workspace';
  title: string; // 页面标题
  path: string; // 路由路径
  icon?: string; // 菜单图标
  permissions?: string[]; // 权限要求

  // 数据源配置
  dataSource: {
    type: 'function' | 'api' | 'static';
    functionId?: string; // 关联的函数ID
    apiEndpoint?: string; // API端点
    params?: Record<string, any>;
  };

  // UI配置
  ui: UIConfig;

  // 布局配置
  layout?: {
    type: 'default' | 'blank' | 'tabs';
    width?: 'fixed' | 'fluid';
  };

  // 子页面
  children?: PageConfig[];
}
```

**UIConfig (UI 配置)**:

```typescript
interface UIConfig {
  // 列表页配置
  list?: {
    columns: ColumnConfig[];
    actions?: ActionConfig[];
    filters?: FilterConfig[];
    pagination?: PaginationConfig;
  };

  // 详情页配置
  detail?: {
    sections: SectionConfig[];
    actions?: ActionConfig[];
  };

  // 表单配置
  form?: {
    schema: JSONSchema; // JSON Schema
    uiSchema?: FormilyUISchema; // Formily UI Schema
    layout?: 'horizontal' | 'vertical' | 'inline';
  };

  // 仪表盘配置
  dashboard?: {
    widgets: WidgetConfig[];
    layout: GridLayout;
  };

  // 工作台配置
  workspace?: {
    operations: OperationConfig[];
    layout: 'single' | 'tabs' | 'accordion';
  };
}
```

#### 3.2.2 动态路由系统

**使用 React Router v6 动态路由**:

```typescript
// src/router/DynamicRouter.tsx
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageGenerator } from './PageGenerator';
import { fetchPageConfigs } from '@/api/pages';

export function DynamicRouter() {
  const [routes, setRoutes] = useState<PageConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoutes();

    // 监听配置更新事件
    const handleConfigUpdate = () => loadRoutes();
    window.addEventListener('config:update', handleConfigUpdate);

    return () => {
      window.removeEventListener('config:update', handleConfigUpdate);
    };
  }, []);

  const loadRoutes = async () => {
    const configs = await fetchPageConfigs();
    setRoutes(configs);
    setLoading(false);
  };

  if (loading) return <Loading />;

  return (
    <Routes>
      {routes.map((config) => (
        <Route key={config.id} path={config.path} element={<PageGenerator config={config} />} />
      ))}
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
```

#### 3.2.3 页面生成器

**PageGenerator (页面生成器)**:

```typescript
// src/generator/PageGenerator.tsx
import { ListPage } from './pages/ListPage';
import { DetailPage } from './pages/DetailPage';
import { FormPage } from './pages/FormPage';
import { DashboardPage } from './pages/DashboardPage';
import { WorkspacePage } from './pages/WorkspacePage';

export function PageGenerator({ config }: { config: PageConfig }) {
  // 权限检查
  if (!hasPermission(config.permissions)) {
    return <Forbidden />;
  }

  // 根据页面类型生成对应页面
  switch (config.type) {
    case 'list':
      return <ListPage config={config} />;
    case 'detail':
      return <DetailPage config={config} />;
    case 'form':
      return <FormPage config={config} />;
    case 'dashboard':
      return <DashboardPage config={config} />;
    case 'workspace':
      return <WorkspacePage config={config} />;
    default:
      return <NotSupported type={config.type} />;
  }
}
```

**ListPage (列表页生成器)**:

```typescript
// src/generator/pages/ListPage.tsx
export function ListPage({ config }: { config: PageConfig }) {
  const { data, loading, refresh } = useDataSource(config.dataSource);
  const { columns, actions, filters } = config.ui.list!;

  return (
    <PageContainer title={config.title}>
      {/* 筛选器 */}
      {filters && <FilterBar filters={filters} />}

      {/* 操作按钮 */}
      {actions && <ActionBar actions={actions} />}

      {/* 数据表格 */}
      <ProTable
        dataSource={data}
        columns={generateColumns(columns)}
        loading={loading}
        onRefresh={refresh}
      />
    </PageContainer>
  );
}
```

#### 3.2.4 配置管理器

**ConfigManager (配置管理器)**:

```typescript
// src/config/ConfigManager.ts
class ConfigManager {
  private configs: Map<string, PageConfig> = new Map();
  private listeners: Set<Function> = new Set();

  // 加载配置
  async loadConfigs() {
    const configs = await fetchPageConfigs();
    configs.forEach((config) => {
      this.configs.set(config.id, config);
    });
    this.notifyListeners();
  }

  // 更新配置
  async updateConfig(id: string, config: PageConfig) {
    await savePageConfig(id, config);
    this.configs.set(id, config);
    this.notifyListeners();

    // 触发热更新
    window.dispatchEvent(new CustomEvent('config:update'));
  }

  // 获取配置
  getConfig(id: string): PageConfig | undefined {
    return this.configs.get(id);
  }

  // 获取所有配置
  getAllConfigs(): PageConfig[] {
    return Array.from(this.configs.values());
  }

  // 订阅配置变化
  subscribe(listener: Function) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }
}

export const configManager = new ConfigManager();
```

#### 3.2.5 组件注册表

**ComponentRegistry (组件注册表)**:

```typescript
// src/registry/ComponentRegistry.ts
class ComponentRegistry {
  private components: Map<string, React.ComponentType<any>> = new Map();

  // 注册组件
  register(name: string, component: React.ComponentType<any>) {
    this.components.set(name, component);
  }

  // 获取组件
  get(name: string): React.ComponentType<any> | undefined {
    return this.components.get(name);
  }

  // 批量注册
  registerBatch(components: Record<string, React.ComponentType<any>>) {
    Object.entries(components).forEach(([name, component]) => {
      this.register(name, component);
    });
  }
}

export const componentRegistry = new ComponentRegistry();

// 注册内置组件
componentRegistry.registerBatch({
  ProTable: ProTable,
  ProForm: ProForm,
  ProDescriptions: ProDescriptions,
  Chart: Chart,
  // ... 更多组件
});
```

---

## 四、实现方案

### 4.1 技术选型

**推荐方案 A: Next.js + React Router**

```
优势:
- ✅ SSR支持，首屏快
- ✅ 文件路由 + 动态路由混合
- ✅ API Routes内置
- ✅ 生态成熟
- ✅ 部署简单

劣势:
- ⚠️ 学习曲线
- ⚠️ 需要迁移现有代码
```

**推荐方案 B: Vite + React Router**

```
优势:
- ✅ 开发体验极佳
- ✅ 构建速度快
- ✅ 配置简单
- ✅ 迁移成本低

劣势:
- ⚠️ 无SSR (可用Vite SSR插件)
```

**不推荐: 继续使用 Umi**

```
原因:
- ❌ 静态路由限制
- ❌ 约定式路由不适合完全动态场景
- ❌ 配置复杂
- ❌ 热更新支持差
```

### 4.2 迁移策略

**阶段 1: 基础架构搭建 (2 周)**

1. 搭建新项目 (Next.js/Vite)
2. 实现动态路由系统
3. 实现配置管理器
4. 实现页面生成器框架

**阶段 2: 核心功能迁移 (4 周)**

1. 迁移列表页生成器
2. 迁移表单页生成器
3. 迁移详情页生成器
4. 迁移工作台页面

**阶段 3: 完善与优化 (2 周)**

1. 实现配置管理界面
2. 实现可视化配置工具
3. 性能优化
4. 测试与文档

**总计: 8 周 (2 个月)**

### 4.3 成本评估

**人力成本**:

- 1 个全栈工程师 × 2 个月 = 2 人月
- 或 2 个工程师 × 1 个月 = 2 人月

**风险**:

- 低风险: 技术成熟，方案清晰
- 可回退: 保留现有系统，新系统独立开发

---

## 五、成熟方案对比

### 5.1 开源方案调研

#### 方案 1: Amis (百度)

**简介**: 低代码前端框架，JSON 配置生成页面

**优势**:

- ✅ 完全 JSON 配置驱动
- ✅ 组件丰富 (100+)
- ✅ 文档完善
- ✅ 开箱即用
- ✅ 支持可视化编辑器

**劣势**:

- ⚠️ 定制能力有限
- ⚠️ 样式定制困难
- ⚠️ 学习曲线陡峭
- ⚠️ 社区活跃度一般

**适用场景**: 标准化管理后台，定制需求少

**评分**: ⭐⭐⭐⭐ (推荐)

#### 方案 2: NocoBase

**简介**: 开源无代码/低代码平台

**优势**:

- ✅ 完整的低代码平台
- ✅ 支持插件系统
- ✅ 数据模型驱动
- ✅ 可视化配置
- ✅ 开源免费

**劣势**:

- ⚠️ 较重，学习成本高
- ⚠️ 需要独立部署
- ⚠️ 与现有系统集成复杂

**适用场景**: 从零开始的新项目

**评分**: ⭐⭐⭐

#### 方案 3: Refine

**简介**: React 管理后台框架

**优势**:

- ✅ 基于 React
- ✅ 灵活性高
- ✅ 支持多种 UI 库
- ✅ TypeScript 支持好
- ✅ 文档优秀

**劣势**:

- ⚠️ 仍需写代码
- ⚠️ 不是完全动态生成
- ⚠️ 配置较多

**适用场景**: 需要高度定制的项目

**评分**: ⭐⭐⭐⭐

#### 方案 4: FormRender (阿里)

**简介**: 表单渲染引擎

**优势**:

- ✅ 专注表单
- ✅ 性能好
- ✅ 配置简单
- ✅ 阿里维护

**劣势**:

- ⚠️ 仅支持表单
- ⚠️ 需要自己实现列表/详情

**适用场景**: 表单密集型应用

**评分**: ⭐⭐⭐

### 5.2 方案推荐

**推荐 1: Amis (如果接受其限制)**

```
适用条件:
- 标准化管理后台
- 定制需求少
- 追求快速上线
- 团队学习能力强

预计时间: 1-2个月
```

**推荐 2: 自研新架构 (如果需要灵活性)**

```
适用条件:
- 需要高度定制
- 有技术积累需求
- 团队有开发能力
- 可接受2个月开发周期

预计时间: 2个月
```

**推荐 3: Refine + 自研生成器 (折中方案)**

```
适用条件:
- 需要一定灵活性
- 想要快速起步
- 可以接受部分手写代码

预计时间: 1.5个月
```

---

## 六、决策建议

### 6.1 决策矩阵

| 方案            | 开发周期 | 灵活性     | 维护成本   | 学习成本   | 推荐度     |
| --------------- | -------- | ---------- | ---------- | ---------- | ---------- |
| **继续现有**    | 6-12 月  | ⭐⭐⭐⭐   | ⭐⭐       | ⭐⭐⭐⭐⭐ | ⭐⭐       |
| **Amis**        | 1-2 月   | ⭐⭐       | ⭐⭐⭐⭐   | ⭐⭐       | ⭐⭐⭐⭐   |
| **自研新架构**  | 2 月     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| **Refine 混合** | 1.5 月   | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   |
| **NocoBase**    | 2-3 月   | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ | ⭐⭐       | ⭐⭐⭐     |

### 6.2 我的建议

**如果是我，我会选择: 自研新架构** ⭐⭐⭐⭐⭐

**理由**:

1. **完全掌控**: 可以实现任何需求
2. **技术积累**: 形成核心竞争力
3. **灵活性**: 可以随时调整
4. **成本可控**: 2 个月可完成核心功能
5. **长期价值**: 可以持续演进

**实施建议**:

1. 采用 **Vite + React Router** (开发体验好，迁移成本低)
2. 保留现有系统，新系统独立开发
3. 先实现核心功能 (列表/表单/详情)
4. 逐步迁移现有页面
5. 最后实现可视化配置工具

**时间规划**:

- Week 1-2: 基础架构
- Week 3-4: 列表页生成器
- Week 5-6: 表单页生成器
- Week 7-8: 详情页生成器 + 优化

---

## 七、快速原型

### 7.1 核心代码示例

**1. 页面配置示例**:

```typescript
// 用户列表页配置
const userListConfig: PageConfig = {
  id: 'user-list',
  type: 'list',
  title: '用户管理',
  path: '/users',
  icon: 'UserOutlined',
  permissions: ['users:read'],

  dataSource: {
    type: 'function',
    functionId: 'user.list',
  },

  ui: {
    list: {
      columns: [
        { key: 'id', title: 'ID', width: 80 },
        { key: 'username', title: '用户名', width: 150 },
        { key: 'email', title: '邮箱', width: 200 },
        { key: 'status', title: '状态', width: 100, render: 'status' },
        { key: 'createdAt', title: '创建时间', width: 180, render: 'datetime' },
      ],
      actions: [
        { key: 'create', label: '新建用户', type: 'primary', icon: 'PlusOutlined' },
        { key: 'export', label: '导出', icon: 'ExportOutlined' },
      ],
      filters: [
        { key: 'username', label: '用户名', type: 'input' },
        { key: 'status', label: '状态', type: 'select', options: [...] },
      ],
    },
  },
};
```

**2. 使用示例**:

```typescript
// 1. 后端注册函数时自动生成配置
POST /api/functions/register
{
  "id": "user.list",
  "name": "获取用户列表",
  "inputSchema": { ... },
  "outputSchema": { ... },
  "autoGenerateUI": true  // 自动生成UI配置
}

// 2. 前端自动获取配置并渲染
// 无需任何手写代码，页面自动生成

// 3. 如需定制，通过配置管理界面修改
// 修改后立即生效，无需重启
```

---

## 八、总结

### 8.1 核心观点

1. **现有方案的根本问题是架构选型错误**

   - Umi 的静态路由不适合完全动态的场景
   - 元数据设计不完整
   - 缺少统一的配置管理

2. **重新设计比修修补补更高效**

   - 继续开发需要 6-12 个月
   - 重新设计只需 2 个月
   - 新架构更简洁、更灵活

3. **自研方案是最佳选择**
   - 完全掌控
   - 技术积累
   - 长期价值

### 8.2 行动建议

**立即行动**:

1. 停止在现有架构上继续开发
2. 用 1 周时间搭建新架构原型
3. 验证可行性后全力迁移

**2 个月后**:

- 核心功能完成
- 可以替代现有系统
- 实现真正的"函数注册即可用"

**6 个月后**:

- 完善可视化配置工具
- 形成完整的低代码平台
- 成为核心竞争力

---

**方案结束**

如需详细的技术实现细节或原型代码，请告知。
