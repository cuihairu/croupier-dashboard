# 函数描述符分析报告

**分析日期**: 2026-03-06 **目标**: 评估现有函数描述符是否满足 Workspace 编排需求

---

## 一、现有函数描述符结构

### 1.1 核心字段

```typescript
export type FunctionDescriptor = {
  // ========== 基础信息 ==========
  id: string; // 函数ID，如 "player.getInfo"
  type?: 'function' | 'entity'; // 类型
  version?: string; // 版本
  category?: string; // 分类
  description?: string; // 描述

  // ========== 显示信息 ==========
  display_name?: { zh?: string; en?: string }; // 显示名称
  summary?: { zh?: string; en?: string }; // 摘要

  // ========== 实体和操作 ==========
  entity?: string; // 实体名，如 "player"
  operation?: string; // 操作名，如 "getInfo"
  entity_display?: { zh?: string; en?: string }; // 实体显示名
  operation_display?: { zh?: string; en?: string }; // 操作显示名

  // ========== 标签和菜单 ==========
  tags?: string[]; // 标签
  menu?: {
    nodes?: string[]; // 菜单节点
    path?: string; // 菜单路径
    order?: number; // 排序
    icon?: string; // 图标
    badge?: string; // 徽章
    hidden?: boolean; // 是否隐藏
  };

  // ========== Schema（核心） ==========
  params?: any; // 参数（旧格式）
  input_schema?: string; // 输入 Schema（JSON Schema，字符串格式）
  output_schema?: string; // 输出 Schema（JSON Schema，字符串格式）

  // ========== UI配置 ==========
  ui?: any; // UI配置
  outputs?: any; // 输出配置

  // ========== 实体相关 ==========
  schema?: any; // 实体 Schema
  operations?: any; // 实体操作

  // ========== 权限 ==========
  auth?: Record<string, any>; // 权限配置
};
```

---

## 二、满足度分析

### 2.1 ✅ 已满足的需求

#### 1. 函数识别和分组

```typescript
// ✅ 可以识别实体
entity: "player"
entity_display: { zh: "玩家", en: "Player" }

// ✅ 可以识别操作
operation: "getInfo"
operation_display: { zh: "获取信息", en: "Get Info" }

// ✅ 可以通过 ID 推断
id: "player.getInfo" → entity: "player", operation: "getInfo"
```

**结论**: ✅ 可以自动将函数分组到 Workspace

---

#### 2. 输入输出 Schema

```typescript
// ✅ 有 OpenAPI 3.0 格式的 Schema
input_schema: string; // JSON Schema（字符串）
output_schema: string; // JSON Schema（字符串）

// 示例
input_schema: JSON.stringify({
  type: 'object',
  properties: {
    playerId: { type: 'string', title: '玩家ID' },
    level: { type: 'number', title: '等级' },
  },
  required: ['playerId'],
});
```

**结论**: ✅ 可以自动生成表单和推断列配置

---

#### 3. UI 配置

```typescript
// ✅ 已有 UI 配置支持
ui?: any;

// ✅ 已有 UI Schema 管理
fetchFunctionUiSchema(functionId)
saveFunctionUiSchema(functionId, uiConfig)
```

**结论**: ✅ 可以存储自定义 UI 配置

---

#### 4. 菜单和排序

```typescript
// ✅ 有菜单配置
menu?: {
  nodes?: string[];      // 菜单节点
  order?: number;        // 排序
  icon?: string;         // 图标
  hidden?: boolean;      // 是否隐藏
}
```

**结论**: ✅ 可以控制显示和排序

---

### 2.2 ⚠️ 部分满足的需求

#### 1. 函数关系和依赖

```typescript
// ⚠️ 缺少：函数之间的关系
// 例如：getInfo 的结果可以作为 updateLevel 的输入

// 建议扩展：
{
  dependencies?: {
    requires?: string[];     // 依赖的函数
    provides?: string[];     // 提供给其他函数的数据
  }
}
```

**结论**: ⚠️ 需要扩展，但可以通过约定解决

---

#### 2. 布局提示

```typescript
// ⚠️ 缺少：推荐的布局方式
// 例如：list 函数适合列表布局，getInfo 适合详情布局

// 建议扩展：
{
  ui?: {
    layout?: 'list' | 'form' | 'detail' | 'dashboard';
    // ...
  }
}
```

**结论**: ⚠️ 需要扩展，但可以通过函数名推断

---

#### 3. 操作类型标识

```typescript
// ⚠️ 缺少：明确的操作类型
// 例如：这是查询操作还是修改操作？

// 建议扩展：
{
  operationType?: 'query' | 'mutation' | 'action';
  // 或者
  tags?: ['query', 'readonly', 'safe']
}
```

**结论**: ⚠️ 需要扩展，但可以通过函数名推断

---

### 2.3 ❌ 缺失的需求

#### 1. Workspace 布局配置

```typescript
// ❌ 缺少：Workspace 级别的布局配置
// 需要新增：

export type WorkspaceConfig = {
  objectKey: string; // 对象标识，如 "player"
  title: string; // 标题
  layout: WorkspaceLayout; // 布局配置
};

export type WorkspaceLayout = {
  type: 'tabs' | 'sections' | 'wizard' | 'dashboard';
  tabs?: TabConfig[];
  sections?: SectionConfig[];
  // ...
};
```

**结论**: ❌ 需要新增 Workspace 配置存储

---

#### 2. 函数编排配置

```typescript
// ❌ 缺少：如何将多个函数组合成一个界面
// 需要新增：

export type FunctionComposition = {
  id: string;
  title: string;
  functions: {
    functionId: string;
    role: 'query' | 'action' | 'display';
    position: 'header' | 'body' | 'footer' | 'sidebar';
    // ...
  }[];
};
```

**结论**: ❌ 需要新增编排配置

---

## 三、总体评估

### 3.1 满足度评分

| 需求                | 满足度  | 说明                                  |
| ------------------- | ------- | ------------------------------------- |
| **函数识别和分组**  | ✅ 100% | entity + operation 完全满足           |
| **输入输出 Schema** | ✅ 100% | input_schema + output_schema 完全满足 |
| **UI 配置存储**     | ✅ 100% | 已有 UI Schema 管理                   |
| **菜单和排序**      | ✅ 100% | menu 配置完全满足                     |
| **函数关系**        | ⚠️ 50%  | 可以通过约定解决                      |
| **布局提示**        | ⚠️ 50%  | 可以通过推断解决                      |
| **操作类型**        | ⚠️ 50%  | 可以通过推断解决                      |
| **Workspace 配置**  | ❌ 0%   | 需要新增                              |
| **函数编排**        | ❌ 0%   | 需要新增                              |

**总体满足度**: 约 **70%**

---

## 四、推荐方案

### 方案 A：最小扩展（推荐）

**核心思路**: 利用现有字段 + 约定 + 少量扩展

#### 1. 利用现有字段

```typescript
// ✅ 使用 entity + operation 分组
entity: 'player';
operation: 'getInfo';

// ✅ 使用 input_schema + output_schema 生成 UI
input_schema: '...';
output_schema: '...';

// ✅ 使用 tags 标识操作类型
tags: ['query', 'readonly']; // 查询操作
tags: ['mutation', 'write']; // 修改操作
```

#### 2. 约定优于配置

```typescript
// 通过函数名推断布局
player.list      → 列表布局
player.getInfo   → 详情布局
player.create    → 表单布局
player.update    → 表单布局
player.delete    → 确认对话框
```

#### 3. 新增 Workspace 配置存储

```typescript
// 新增 API
GET  /api/v1/workspaces/:objectKey/config
PUT  /api/v1/workspaces/:objectKey/config

// 配置格式
{
  objectKey: "player",
  title: "玩家管理",
  layout: {
    type: "tabs",
    tabs: [
      {
        key: "info",
        title: "玩家信息",
        functions: ["player.getInfo"],
        layout: "form-detail"
      },
      {
        key: "list",
        title: "玩家列表",
        functions: ["player.list"],
        layout: "list"
      }
    ]
  }
}
```

**优势**:

- ✅ 改动最小
- ✅ 兼容现有系统
- ✅ 快速实现

---

### 方案 B：完整扩展

**核心思路**: 扩展函数描述符，增加更多元数据

#### 1. 扩展 FunctionDescriptor

```typescript
export type FunctionDescriptor = {
  // ... 现有字段

  // 新增：操作类型
  operationType?: 'query' | 'mutation' | 'action';

  // 新增：推荐布局
  recommendedLayout?: 'list' | 'form' | 'detail' | 'dashboard';

  // 新增：函数关系
  dependencies?: {
    requires?: string[]; // 依赖的函数
    provides?: string[]; // 提供的数据
  };

  // 新增：UI 提示
  uiHints?: {
    showInWorkspace?: boolean;
    workspacePosition?: 'primary' | 'secondary' | 'action';
    icon?: string;
    color?: string;
  };
};
```

**劣势**:

- ⚠️ 改动较大
- ⚠️ 需要修改后端
- ⚠️ 需要迁移现有数据

---

## 五、结论和建议

### 5.1 核心结论

**现有函数描述符基本满足需求（70%）**

关键满足点：

- ✅ entity + operation 可以分组
- ✅ input_schema + output_schema 可以生成 UI
- ✅ 已有 UI 配置存储机制

关键缺失点：

- ❌ 缺少 Workspace 级别的布局配置
- ❌ 缺少函数编排配置

---

### 5.2 推荐实施方案

**采用方案 A：最小扩展**

#### Phase 1: 利用现有字段（立即可做）

1. 使用 entity + operation 自动分组
2. 使用 input_schema + output_schema 自动生成 UI
3. 通过函数名约定推断布局类型

#### Phase 2: 新增 Workspace 配置（1 周）

1. 新增 Workspace 配置 API
2. 实现配置存储和加载
3. 支持手动编排函数

#### Phase 3: 可视化编排工具（2-4 周）

1. 实现 Workspace 编排器
2. 支持拖拽和配置
3. 实时预览

---

### 5.3 具体行动

#### 立即可做（今天）

```typescript
// 1. 分析现有函数，验证可行性
const descriptors = await listDescriptors();
const workspaces = buildWorkspaceObjects(descriptors);

// 2. 尝试自动推断布局
workspaces.forEach((workspace) => {
  workspace.operations.forEach((op) => {
    const layoutType = inferLayoutType(op.name);
    console.log(`${op.id} → ${layoutType}`);
  });
});

// 3. 尝试从 Schema 生成 UI
const descriptor = descriptors.find((d) => d.id === 'player.getInfo');
const inputSchema = JSON.parse(descriptor.input_schema);
const formFields = generateFormFields(inputSchema);
```

#### 本周完成（Week 1）

1. 实现函数分析和推断逻辑
2. 实现基于约定的自动布局
3. 验证可行性

#### 下周完成（Week 2）

1. 设计 Workspace 配置格式
2. 实现配置存储 API
3. 实现配置加载和渲染

---

## 六、风险和注意事项

### 6.1 风险

1. **Schema 质量不一致**

   - 风险：有些函数的 Schema 可能不完整
   - 应对：提供默认值和降级方案

2. **函数命名不规范**

   - 风险：无法通过函数名推断类型
   - 应对：支持手动配置

3. **复杂场景支持不足**
   - 风险：简单的约定无法覆盖所有场景
   - 应对：逐步增强，先支持 80% 的场景

---

### 6.2 注意事项

1. **向后兼容**

   - 新功能不能影响现有功能
   - 保留现有的函数调用界面作为降级方案

2. **渐进式增强**

   - 先支持简单场景
   - 逐步增加复杂功能

3. **用户体验**
   - 自动推断要准确
   - 手动配置要简单
   - 预览要实时

---

## 七、下一步

### 立即行动

1. **验证现有数据**

   ```bash
   # 获取所有函数描述符
   curl http://localhost:18780/api/v1/functions/descriptors

   # 分析 Schema 质量
   # 检查有多少函数有完整的 input_schema 和 output_schema
   ```

2. **编写分析脚本**

   ```typescript
   // 分析函数分布
   // 统计各种操作类型的数量
   // 评估自动推断的准确率
   ```

3. **设计配置格式**
   ```typescript
   // 设计 WorkspaceConfig 的详细格式
   // 考虑各种布局场景
   ```

---

**结论**: 现有函数描述符**基本满足需求**，通过**最小扩展**即可实现 Workspace 编排功能。

**建议**: 采用**方案 A（最小扩展）**，分三个阶段实施。
