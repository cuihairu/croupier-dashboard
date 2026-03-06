# Workspace 架构设计文档

**设计日期**: 2026-03-06 **核心理念**: SDK 关注功能，Dashboard 关注 UI

---

## 一、职责划分

### 1.1 SDK（后端）职责：功能注册

```go
// 游戏服务器 SDK
func RegisterFunctions() {
    // 只需要注册函数功能
    croupier.Register("player.getInfo", PlayerGetInfo,
        croupier.WithInputSchema(playerGetInfoInput),
        croupier.WithOutputSchema(playerGetInfoOutput),
        croupier.WithDescription("获取玩家信息"),
    )

    croupier.Register("player.updateLevel", PlayerUpdateLevel,
        croupier.WithInputSchema(playerUpdateLevelInput),
        croupier.WithOutputSchema(playerUpdateLevelOutput),
        croupier.WithDescription("更新玩家等级"),
    )
}
```

**SDK 关注**：

- ✅ 函数是什么
- ✅ 输入输出是什么
- ✅ 功能描述

**SDK 不关注**：

- ❌ UI 怎么展示
- ❌ 放在哪个菜单
- ❌ 和其他函数怎么组合

---

### 1.2 Dashboard（前端）职责：UI 编排

```typescript
// Dashboard 负责配置
{
  objectKey: "player",
  title: "玩家管理",
  layout: {
    type: "tabs",
    tabs: [
      {
        title: "玩家信息",
        functions: ["player.getInfo"],
        layout: "form-detail"
      }
    ]
  }
}
```

**Dashboard 关注**：

- ✅ UI 怎么展示
- ✅ 函数怎么编排
- ✅ 菜单怎么组织
- ✅ 权限怎么分配

---

## 二、完整架构图

```
┌─────────────────────────────────────────────────────┐
│ 游戏服务器（SDK）                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  注册函数：                                           │
│    player.getInfo(playerId)                         │
│    player.updateLevel(playerId, level)              │
│    player.addGold(playerId, amount)                 │
│                                                      │
│  提供元数据：                                         │
│    - 函数 ID                                         │
│    - 输入输出 Schema                                  │
│    - 描述信息                                         │
│                                                      │
└──────────────────┬──────────────────────────────────┘
                   │ 注册
                   ↓
┌─────────────────────────────────────────────────────┐
│ 函数注册中心（后端）                                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  存储：                                              │
│    - FunctionDescriptor（函数元数据）                │
│    - 不包含 UI 配置                                   │
│                                                      │
│  提供 API：                                          │
│    GET /api/v1/functions/descriptors                │
│                                                      │
└──────────────────┬──────────────────────────────────┘
                   │ 查询
                   ↓
┌─────────────────────────────────────────────────────┐
│ Dashboard（前端）                                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. 加载函数列表                                      │
│  2. 按 entity 分组                                    │
│  3. 提供可视化编排工具                                │
│  4. 生成 Workspace 配置                              │
│  5. 存储到配置中心                                    │
│                                                      │
└──────────────────┬──────────────────────────────────┘
                   │ 保存配置
                   ↓
┌─────────────────────────────────────────────────────┐
│ 配置中心（后端）                                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  存储：                                              │
│    - WorkspaceConfig（Workspace 配置）               │
│    - FunctionUIConfig（函数 UI 配置）                │
│    - PermissionConfig（权限配置）                     │
│                                                      │
│  提供 API：                                          │
│    GET /api/v1/workspaces/:objectKey/config         │
│    PUT /api/v1/workspaces/:objectKey/config         │
│                                                      │
└──────────────────┬──────────────────────────────────┘
                   │ 加载配置
                   ↓
┌─────────────────────────────────────────────────────┐
│ Workspace 页面（前端）                                │
├─────────────────────────────────────────────────────┤
│                                                      │
│  根据配置渲染界面：                                    │
│    - 加载 WorkspaceConfig                            │
│    - 加载对应的 FunctionDescriptor                    │
│    - 使用 Layout Engine 渲染                         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 三、数据流

### 3.1 函数注册流程

```
游戏服务器 SDK
  ↓ 注册函数
函数注册中心
  ↓ 存储 FunctionDescriptor
  {
    id: "player.getInfo",
    entity: "player",
    operation: "getInfo",
    input_schema: {...},
    output_schema: {...}
  }
```

### 3.2 UI 配置流程

```
Dashboard 编排工具
  ↓ 可视化编排
生成 WorkspaceConfig
  {
    objectKey: "player",
    layout: {
      type: "tabs",
      tabs: [...]
    }
  }
  ↓ 保存
配置中心
```

### 3.3 页面渲染流程

```
Workspace 页面
  ↓ 加载配置
配置中心 → WorkspaceConfig
  ↓ 加载函数元数据
函数注册中心 → FunctionDescriptor
  ↓ 渲染
Layout Engine → 最终界面
```

---

## 四、核心数据结构

### 4.1 FunctionDescriptor（SDK 提供）

```typescript
export type FunctionDescriptor = {
  // 基础信息
  id: string; // 函数ID，如 "player.getInfo"
  entity?: string; // 实体名，如 "player"
  operation?: string; // 操作名，如 "getInfo"
  description?: string; // 描述

  // 显示信息
  display_name?: { zh?: string; en?: string };
  entity_display?: { zh?: string; en?: string };
  operation_display?: { zh?: string; en?: string };

  // Schema（核心）
  input_schema?: string; // 输入 Schema（JSON Schema，字符串）
  output_schema?: string; // 输出 Schema（JSON Schema，字符串）

  // 其他元数据
  tags?: string[];
  version?: string;
  category?: string;
};
```

**注意**：FunctionDescriptor **不包含** UI 配置

---

### 4.2 WorkspaceConfig（Dashboard 配置）

```typescript
/**
 * Workspace 配置（存储在配置中心）
 */
export interface WorkspaceConfig {
  objectKey: string; // 对象标识
  title: string; // 标题
  description?: string; // 描述
  icon?: string; // 图标
  layout: WorkspaceLayout; // 布局配置
  permissions?: string[]; // 权限要求
  meta?: {
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
  };
}

/**
 * Workspace 布局配置
 */
export interface WorkspaceLayout {
  type: 'tabs' | 'sections' | 'wizard' | 'dashboard';
  tabs?: TabConfig[];
  sections?: SectionConfig[];
  wizard?: WizardConfig;
  dashboard?: DashboardConfig;
}

/**
 * Tab 配置
 */
export interface TabConfig {
  key: string;
  title: string;
  icon?: string;
  functions: string[]; // 使用的函数 ID 列表
  layout: TabLayout; // Tab 内的布局
}

/**
 * Tab 内布局
 */
export interface TabLayout {
  type: 'form-detail' | 'list' | 'form' | 'detail' | 'custom';

  // form-detail 布局（先查询，再显示详情和操作）
  queryFunction?: string; // 查询函数
  queryFields?: FieldConfig[]; // 查询字段
  detailSections?: DetailSection[];
  actions?: ActionConfig[]; // 操作按钮

  // list 布局
  listFunction?: string; // 列表函数
  columns?: ColumnConfig[]; // 列配置
  rowActions?: ActionConfig[]; // 行操作

  // form 布局
  formFunction?: string; // 表单提交函数
  fields?: FieldConfig[]; // 表单字段

  // detail 布局
  detailFunction?: string; // 详情函数
  sections?: DetailSection[]; // 详情区块
}
```

---

## 五、配置示例

### 5.1 玩家管理 Workspace 配置

```typescript
{
  objectKey: "player",
  title: "玩家管理",
  icon: "UserOutlined",
  layout: {
    type: "tabs",
    tabs: [
      // Tab 1: 玩家信息
      {
        key: "info",
        title: "玩家信息",
        icon: "InfoCircleOutlined",
        functions: [
          "player.getInfo",
          "player.updateLevel",
          "player.addGold",
          "player.banPlayer"
        ],
        layout: {
          type: "form-detail",
          // 查询区
          queryFunction: "player.getInfo",
          queryFields: [
            {
              key: "playerId",
              label: "玩家ID",
              type: "input",
              required: true,
              placeholder: "请输入玩家ID"
            }
          ],
          // 详情区
          detailSections: [
            {
              title: "基本信息",
              fields: [
                { key: "playerId", label: "玩家ID" },
                { key: "nickname", label: "昵称" },
                { key: "level", label: "等级" },
                { key: "gold", label: "金币" },
                { key: "status", label: "状态", render: "status" }
              ]
            }
          ],
          // 操作区
          actions: [
            {
              key: "updateLevel",
              label: "更新等级",
              icon: "ArrowUpOutlined",
              function: "player.updateLevel",
              type: "modal",
              fields: [
                {
                  key: "level",
                  label: "新等级",
                  type: "number",
                  required: true
                }
              ]
            },
            {
              key: "addGold",
              label: "增加金币",
              icon: "DollarOutlined",
              function: "player.addGold",
              type: "modal",
              fields: [
                {
                  key: "amount",
                  label: "金额",
                  type: "number",
                  required: true
                }
              ]
            },
            {
              key: "banPlayer",
              label: "封禁玩家",
              icon: "StopOutlined",
              danger: true,
              function: "player.banPlayer",
              type: "modal",
              confirm: {
                title: "确认封禁",
                content: "封禁后玩家将无法登录，确认操作吗？"
              },
              fields: [
                {
                  key: "reason",
                  label: "封禁原因",
                  type: "textarea",
                  required: true
                },
                {
                  key: "duration",
                  label: "封禁时长（小时）",
                  type: "number"
                }
              ]
            }
          ]
        }
      },

      // Tab 2: 玩家列表
      {
        key: "list",
        title: "玩家列表",
        icon: "UnorderedListOutlined",
        functions: ["player.list"],
        layout: {
          type: "list",
          listFunction: "player.list",
          columns: [
            { key: "playerId", title: "玩家ID", width: 150 },
            { key: "nickname", title: "昵称", width: 150 },
            { key: "level", title: "等级", width: 100 },
            { key: "gold", title: "金币", width: 120, render: "money" },
            { key: "status", title: "状态", width: 100, render: "status" },
            { key: "lastLoginAt", title: "最后登录", width: 180, render: "datetime" }
          ],
          rowActions: [
            {
              key: "view",
              label: "查看",
              icon: "EyeOutlined",
              onClick: {
                type: "navigate",
                path: "/console/player?tab=info&playerId={playerId}"
              }
            }
          ]
        }
      },

      // Tab 3: 操作历史
      {
        key: "history",
        title: "操作历史",
        icon: "HistoryOutlined",
        functions: ["player.queryHistory"],
        layout: {
          type: "list",
          listFunction: "player.queryHistory",
          columns: [
            { key: "timestamp", title: "时间", width: 180, render: "datetime" },
            { key: "operation", title: "操作", width: 150 },
            { key: "operator", title: "操作人", width: 120 },
            { key: "details", title: "详情", width: 300 }
          ]
        }
      }
    ]
  }
}
```

---

## 六、API 设计

### 6.1 配置管理 API

```typescript
// 获取 Workspace 配置
GET /api/v1/workspaces/:objectKey/config
Response: WorkspaceConfig

// 保存 Workspace 配置
PUT /api/v1/workspaces/:objectKey/config
Body: WorkspaceConfig
Response: { success: boolean }

// 获取所有 Workspace 配置列表
GET /api/v1/workspaces/configs
Response: { items: WorkspaceConfig[] }

// 删除 Workspace 配置
DELETE /api/v1/workspaces/:objectKey/config
Response: { success: boolean }
```

### 6.2 函数查询 API（已有）

```typescript
// 获取所有函数描述符
GET /api/v1/functions/descriptors
Response: FunctionDescriptor[]

// 获取单个函数描述符
GET /api/v1/functions/:functionId
Response: FunctionDescriptor

// 调用函数
POST /api/v1/functions/:functionId/invoke
Body: { payload: any }
Response: any
```

---

## 七、优势

### 7.1 职责清晰

```
SDK（后端）：
  ✅ 只关心功能实现
  ✅ 提供标准的元数据
  ✅ 不需要关心 UI

Dashboard（前端）：
  ✅ 只关心 UI 展示
  ✅ 灵活配置布局
  ✅ 不需要修改后端
```

### 7.2 灵活性高

```
同一个函数，可以在不同的 Workspace 中：
  - 不同的展示方式
  - 不同的组合方式
  - 不同的权限控制
```

### 7.3 易于维护

```
修改 UI：
  ✅ 只需要修改配置
  ✅ 不需要重启服务
  ✅ 不需要重新注册函数

添加新函数：
  ✅ SDK 注册后自动可用
  ✅ Dashboard 可以立即编排
```

### 7.4 前后端解耦

```
前端：
  - 独立开发 UI
  - 独立测试
  - 独立部署

后端：
  - 专注业务逻辑
  - 不关心 UI
  - 稳定的 API
```

---

## 八、实施路线图

### Phase 1: 配置存储和加载（Week 1）

**后端任务**：

1. 设计 WorkspaceConfig 数据表
2. 实现配置 CRUD API
3. 实现配置版本管理

**前端任务**：

1. 定义 TypeScript 类型
2. 实现配置加载逻辑
3. 实现 Layout Engine（根据配置渲染）

---

### Phase 2: 可视化编排工具（Week 2-3）

**任务**：

1. 实现 Workspace 编排器界面
2. 实现函数列表展示
3. 实现拖拽功能
4. 实现布局设计器
5. 实现实时预览
6. 实现配置保存

---

### Phase 3: 完善和优化（Week 4）

**任务**：

1. 支持更多布局类型
2. 完善交互体验
3. 添加配置模板
4. 测试和优化
5. 编写文档

---

## 九、技术选型

### 9.1 前端

- **React 18** - UI 框架
- **Ant Design 5** - 组件库
- **Pro Components** - 高级组件
- **React DnD** - 拖拽功能
- **Monaco Editor** - 配置编辑器（可选）

### 9.2 后端

- **Go** - 后端语言
- **PostgreSQL** - 配置存储
- **Redis** - 配置缓存

---

## 十、总结

### 核心理念

**SDK 关注功能，Dashboard 关注 UI**

### 关键点

1. ✅ **职责清晰** - SDK 和 Dashboard 各司其职
2. ✅ **灵活性高** - UI 配置完全独立
3. ✅ **易于维护** - 修改 UI 不需要改后端
4. ✅ **前后端解耦** - 独立开发和部署

### 下一步

1. 实现配置存储 API
2. 实现 Layout Engine
3. 实现可视化编排工具
