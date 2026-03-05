# Core V2 原型开发计划

**分支**: `feature/core-v2-prototype` **目标**: 1 周内验证新架构可行性 **日期**: 2026-03-05 开始

---

## 一、技术栈确认 ✅

### 完全复用现有技术栈

- ✅ **Ant Design 5** - 继续使用，样式风格统一
- ✅ **Pro Components** - 继续使用，ProTable/ProForm 等
- ✅ **Formily 2** - 继续使用你现有的表单 Schema
- ✅ **Umi Max** - 继续使用，只是改用动态路由
- ✅ **TypeScript** - 继续使用
- ✅ **现有 API 层** - 完全复用 `src/services/api`
- ✅ **现有权限系统** - 完全复用 `src/access.ts`

### 新增内容（只有核心引擎）

```
src/core-v2/
├── types/           # 类型定义
├── router/          # 动态路由
├── generator/       # 页面生成器
├── hooks/           # 数据源Hook
└── config/          # 配置管理
```

---

## 二、开发计划（7 天）

### Day 1: 项目结构 + 类型定义 ✅

**目标**: 搭建基础架构，定义核心类型

**任务**:

- [x] 创建 `src/core-v2` 目录结构
- [x] 定义 `PageConfig` 类型
- [x] 定义 `DataSourceConfig` 类型
- [x] 定义 `UIConfig` 类型
- [x] 创建配置管理器

**交付物**:

- `src/core-v2/types/index.ts` (完整类型定义)
- `src/core-v2/config/ConfigManager.ts` (配置管理器)

**验收标准**:

- TypeScript 编译通过
- 类型定义清晰完整

---

### Day 2: 动态路由实现

**目标**: 实现基于 Umi 的动态路由机制

**任务**:

- [ ] 实现 `DynamicRouter` 组件
- [ ] 使用 Umi 的 `patchRoutes` API
- [ ] 实现路由配置加载
- [ ] 实现路由热更新机制
- [ ] 在 `app.tsx` 中集成测试路由

**交付物**:

- `src/core-v2/router/DynamicRouter.tsx`
- `src/core-v2/router/index.ts`
- 修改 `src/app.tsx` 添加 `/v2/*` 测试路由

**验收标准**:

- 访问 `/v2/test` 能看到动态路由生效
- 修改配置后刷新能看到变化

---

### Day 3: 页面生成器框架

**目标**: 实现页面生成器核心框架

**任务**:

- [ ] 实现 `PageGenerator` 组件
- [ ] 实现页面类型路由分发
- [ ] 添加错误边界处理
- [ ] 添加加载状态处理
- [ ] 集成权限检查

**交付物**:

- `src/core-v2/generator/PageGenerator.tsx`
- `src/core-v2/generator/ErrorBoundary.tsx`

**验收标准**:

- 能根据 `config.type` 正确路由到不同页面类型
- 错误处理完善

---

### Day 4: 列表页生成器

**目标**: 实现列表页动态生成

**任务**:

- [ ] 实现 `ListPage` 组件
- [ ] 使用 `ProTable` 渲染列表
- [ ] 实现列渲染器（text/status/datetime/tag）
- [ ] 实现操作按钮渲染
- [ ] 实现数据源 Hook
- [ ] 连接现有 API 层

**交付物**:

- `src/core-v2/generator/ListPage.tsx`
- `src/core-v2/hooks/useDataSource.ts`

**验收标准**:

- 能根据配置动态生成列表页
- 支持基本的列渲染
- 能调用现有的 `invokeFunction` API

---

### Day 5: 表单页生成器

**目标**: 实现表单页动态生成，复用 Formily

**任务**:

- [ ] 实现 `FormPage` 组件
- [ ] 复用现有的 `SchemaRenderer`
- [ ] 实现表单提交逻辑
- [ ] 集成现有的 Formily Schema
- [ ] 支持从函数描述符自动生成 Schema

**交付物**:

- `src/core-v2/generator/FormPage.tsx`

**验收标准**:

- 能根据配置动态生成表单页
- 能复用现有的 Formily Schema
- 表单提交能调用后端 API

---

### Day 6: 详情页生成器 + 完善功能

**目标**: 实现详情页生成器，完善核心功能

**任务**:

- [ ] 实现 `DetailPage` 组件
- [ ] 使用 `ProDescriptions` 渲染详情
- [ ] 添加筛选功能到列表页
- [ ] 添加分页功能
- [ ] 优化性能

**交付物**:

- `src/core-v2/generator/DetailPage.tsx`
- 完善的列表页功能

**验收标准**:

- 详情页能正常展示
- 列表页支持筛选和分页
- 性能可接受（首屏<2 秒）

---

### Day 7: 集成测试 + 验收

**目标**: 完整测试，评估可行性

**任务**:

- [ ] 创建完整的测试配置
- [ ] 测试用户管理页面（列表+表单+详情）
- [ ] 测试角色管理页面
- [ ] 性能测试
- [ ] 与现有 Workspace 对比
- [ ] 编写验收报告

**交付物**:

- 完整的测试配置
- 验收报告文档

**验收标准**:

- [ ] 动态路由可运行
- [ ] 列表页可正常展示
- [ ] 表单页可正常提交
- [ ] 详情页可正常展示
- [ ] 可以添加新页面（只需修改配置）
- [ ] 性能可接受（首屏<2 秒）
- [ ] 代码量<500 行

---

## 三、目录结构

```
src/core-v2/
├── types/
│   └── index.ts                 # 核心类型定义
├── router/
│   ├── DynamicRouter.tsx        # 动态路由组件
│   └── index.ts                 # 导出
├── generator/
│   ├── PageGenerator.tsx        # 页面生成器
│   ├── ListPage.tsx             # 列表页生成器
│   ├── FormPage.tsx             # 表单页生成器
│   ├── DetailPage.tsx           # 详情页生成器
│   └── ErrorBoundary.tsx        # 错误边界
├── hooks/
│   ├── useDataSource.ts         # 数据源Hook
│   └── usePageConfig.ts         # 配置Hook
├── config/
│   ├── ConfigManager.ts         # 配置管理器
│   └── mockConfigs.ts           # Mock配置（测试用）
└── index.ts                     # 统一导出
```

---

## 四、核心类型定义（预览）

```typescript
// PageConfig - 页面配置
export interface PageConfig {
  id: string; // 页面唯一标识
  type: 'list' | 'form' | 'detail' | 'dashboard';
  title: string; // 页面标题
  path: string; // 路由路径
  icon?: string; // 菜单图标
  permissions?: string[]; // 权限要求
  dataSource: DataSourceConfig; // 数据源配置
  ui: UIConfig; // UI配置
}

// DataSourceConfig - 数据源配置
export interface DataSourceConfig {
  type: 'function' | 'api' | 'static';
  functionId?: string; // 函数ID（复用现有）
  apiEndpoint?: string; // API端点
  method?: 'GET' | 'POST';
  params?: Record<string, any>;
}

// UIConfig - UI配置
export interface UIConfig {
  list?: ListUIConfig; // 列表页配置
  form?: FormUIConfig; // 表单页配置
  detail?: DetailUIConfig; // 详情页配置
}

// ListUIConfig - 列表页UI配置
export interface ListUIConfig {
  columns: ColumnConfig[]; // 列配置
  actions?: ActionConfig[]; // 操作按钮
  filters?: FilterConfig[]; // 筛选器
  pagination?: boolean; // 是否分页
}

// FormUIConfig - 表单页UI配置
export interface FormUIConfig {
  schema?: any; // Formily Schema（复用现有）
  fields?: FormFieldConfig[]; // 简化字段配置
  layout?: 'horizontal' | 'vertical' | 'inline';
  submitText?: string;
  resetText?: string;
}

// DetailUIConfig - 详情页UI配置
export interface DetailUIConfig {
  sections: DetailSectionConfig[];
  layout?: 'default' | 'card' | 'tabs';
}
```

---

## 五、与现有架构的集成

### 5.1 复用现有组件

```typescript
// ✅ 复用 ProTable
import { ProTable } from '@ant-design/pro-components';

// ✅ 复用 SchemaRenderer
import SchemaRenderer from '@/components/formily/SchemaRenderer';

// ✅ 复用 API层
import { invokeFunction } from '@/services/api';

// ✅ 复用权限系统
import { useAccess } from '@umijs/max';
```

### 5.2 路由集成方式

```typescript
// src/app.tsx
import { DynamicRouter } from '@/core-v2';

export function patchRoutes({ routes }) {
  // 添加 v2 测试路由
  routes.unshift({
    path: '/v2',
    name: 'CoreV2Test',
    icon: 'experiment',
    component: DynamicRouter,
    hideInMenu: false, // 显示在菜单中，方便测试
  });
}
```

### 5.3 配置存储方式

**阶段 1（原型验证）**: 使用本地 Mock 配置

```typescript
// src/core-v2/config/mockConfigs.ts
export const mockPageConfigs: PageConfig[] = [
  {
    id: 'user-list',
    type: 'list',
    title: '用户管理（V2）',
    path: '/v2/users',
    dataSource: { type: 'function', functionId: 'user.list' },
    ui: { list: { columns: [...] } }
  }
];
```

**阶段 2（生产环境）**: 存储到后端

```typescript
// 后端API
GET  /api/page-configs        # 获取所有配置
POST /api/page-configs        # 创建配置
PUT  /api/page-configs/:id    # 更新配置
```

---

## 六、测试计划

### 6.1 功能测试

**测试页面 1: 用户管理**

```typescript
{
  id: 'user-list-v2',
  type: 'list',
  title: '用户管理（V2）',
  path: '/v2/users',
  dataSource: {
    type: 'function',
    functionId: 'user.list' // 复用现有函数
  },
  ui: {
    list: {
      columns: [
        { key: 'id', title: 'ID', width: 80 },
        { key: 'username', title: '用户名', width: 150 },
        { key: 'email', title: '邮箱', width: 200 },
        { key: 'status', title: '状态', render: 'status' },
        { key: 'created_at', title: '创建时间', render: 'datetime' }
      ],
      actions: [
        { key: 'create', label: '新建用户', type: 'primary' }
      ]
    }
  }
}
```

**测试页面 2: 创建用户表单**

```typescript
{
  id: 'user-create-v2',
  type: 'form',
  title: '创建用户（V2）',
  path: '/v2/users/create',
  dataSource: {
    type: 'function',
    functionId: 'user.create'
  },
  ui: {
    form: {
      // 复用现有的Formily Schema
      schema: {
        type: 'object',
        properties: {
          username: { type: 'string', title: '用户名', 'x-component': 'Input' },
          email: { type: 'string', title: '邮箱', 'x-component': 'Input' },
          password: { type: 'string', title: '密码', 'x-component': 'Password' }
        }
      }
    }
  }
}
```

### 6.2 性能测试

**指标**:

- 首屏加载时间 < 2 秒
- 路由切换时间 < 500ms
- 列表渲染时间 < 1 秒
- 内存占用合理

### 6.3 对比测试

**现有架构 vs Core V2**:

| 指标           | 现有架构   | Core V2      | 提升     |
| -------------- | ---------- | ------------ | -------- |
| 添加新页面时间 | 2-4 小时   | 5 分钟       | 24-48 倍 |
| 代码量         | 100-200 行 | 10-20 行配置 | 10 倍    |
| 维护成本       | 高         | 低           | -        |
| 灵活性         | 中         | 高           | -        |

---

## 七、验收标准

### 7.1 必须达到的标准 ✅

- [ ] **动态路由可运行** - 访问 `/v2/users` 能看到页面
- [ ] **列表页可正常展示** - 能显示数据，支持分页
- [ ] **表单页可正常提交** - 能提交数据到后端
- [ ] **详情页可正常展示** - 能显示详细信息
- [ ] **配置驱动** - 添加新页面只需修改配置
- [ ] **性能可接受** - 首屏<2 秒，切换<500ms
- [ ] **代码简洁** - 核心代码<500 行

### 7.2 加分项 ⭐

- [ ] 支持筛选和排序
- [ ] 支持批量操作
- [ ] 支持自定义列渲染
- [ ] 支持配置热更新（无需刷新）
- [ ] 完善的错误处理
- [ ] 完善的加载状态

---

## 八、决策点

### 决策点 1: Day 3 结束

**问题**: 动态路由是否可行？

**评估**:

- Umi 的 `patchRoutes` 是否满足需求？
- 路由切换是否流畅？
- 是否有性能问题？

**决策**:

- ✅ 可行 → 继续
- ❌ 不可行 → 评估是否需要切换到纯 React Router

### 决策点 2: Day 5 结束

**问题**: 页面生成器是否可行？

**评估**:

- 列表页生成是否满足需求？
- 表单页是否能复用 Formily？
- 配置是否够灵活？

**决策**:

- ✅ 可行 → 继续
- ❌ 不可行 → 评估问题，调整方案

### 决策点 3: Day 7 结束（最终决策）

**问题**: 新架构是否值得全面推进？

**评估**:

- 功能是否完整？
- 性能是否可接受？
- 开发效率是否提升？
- 代码是否简洁？

**决策**:

- ✅ 可行 → 制定 2 个月完整开发计划
- ❌ 不可行 → 立即切换到 Amis

---

## 九、风险控制

### 9.1 技术风险

**风险 1**: Umi 的 `patchRoutes` 可能不够灵活 **应对**: 如果不行，可以在 `app.tsx` 中直接使用 React Router 的 `<Routes>`

**风险 2**: 性能可能不达标 **应对**: 使用 React.memo、useMemo 优化；使用虚拟滚动

**风险 3**: 配置可能不够灵活 **应对**: 支持自定义渲染函数，支持插槽机制

### 9.2 时间风险

**风险**: 1 周可能不够 **应对**:

- 优先实现核心功能（列表+表单）
- 详情页可以放到第 2 周
- 如果第 5 天进度不理想，立即评估

### 9.3 回退方案

**如果验证失败**:

1. 删除 `src/core-v2` 目录
2. 切换回 `main` 分支
3. 立即启动 Amis 方案
4. 损失只有 1 周时间

---

## 十、成功后的路线图

### 如果验证成功（2 个月计划）

**Week 2-3: 完善核心功能**

- 完善列表页（筛选、排序、批量操作）
- 完善表单页（复杂表单、验证）
- 完善详情页（多种布局）

**Week 4-5: 配置管理系统**

- 实现配置 CRUD 接口
- 实现配置管理界面
- 实现配置导入导出

**Week 6-7: 迁移现有页面**

- 迁移核心页面到 V2
- 迁移权限系统
- 迁移审批流程

**Week 8: 上线准备**

- 性能优化
- 完善文档
- 培训团队
- 灰度发布

---

## 十一、立即开始

### 现在就开始 Day 1

```bash
# 1. 确认分支
git branch

# 2. 创建目录结构
mkdir -p src/core-v2/{types,router,generator,hooks,config}

# 3. 开始编写类型定义
# 见下一步...
```

---

**准备好了吗？让我们开始 Day 1！** 🚀
