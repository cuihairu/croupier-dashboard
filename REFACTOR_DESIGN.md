# Croupier Dashboard 重构设计文档

> **版本**: v1.0
> **日期**: 2025-02-01
> **状态**: 待实施

---

## 📋 目录

- [一、项目背景与问题诊断](#一项目背景与问题诊断)
- [二、核心理念](#二核心理念)
- [三、整体架构设计](#三整体架构设计)
- [四、动态路由系统](#四动态路由系统)
- [五、页面设计](#五页面设计)
- [六、权限设计](#六权限设计)
- [七、实施计划](#七实施计划)
- [八、技术债务清单](#八技术债务清单)

---

## 一、项目背景与问题诊断

### 1.1 核心问题

**当前界面混乱的根源：**

1. **多套函数管理界面共存**
   - `Functions/Directory/index.tsx` - 新版函数目录
   - `GmFunctions/index.tsx` - 旧版函数管理
   - `Functions/index.tsx` - 函数总览
   - **问题**: 功能重复，用户困惑

2. **对象管理入口分散**
   - `ComponentManagement/index.tsx` - Tab页形式
   - `/game/entities/create` - 独立路由
   - `/game/entities/:id/edit` - 独立路由
   - **问题**: 用户不知道主入口在哪里

3. **缺少按对象分类的视图**
   - 函数列表看不出操作目标
   - `player.get` 和 `player.update` 都操作玩家，但没有关联展示
   - **问题**: 不符合业务逻辑

4. **新旧API混用**
   - `functions.ts` - 旧版API
   - `functions-enhanced.ts` - 新版API
   - **问题**: 数据格式不统一

### 1.2 代码分析发现

**虚拟对象的真实含义**（来自代码分析）：

```typescript
// EntityComposer.tsx
interface EntityComposition {
  id: string;
  name: string;
  operations: EntityOperation[];  // 核心！
}

interface EntityOperation {
  functionId: string;  // 指向已注册的函数
  name: string;
  description: string;
}
```

**结论**: 虚拟对象 = 一组操作同一个目标对象的函数集合

**示例**:
- **玩家对象** = {player.get, player.update, player.delete, player.add_currency}
- **道具对象** = {item.create, item.update, item.delete, item.give}

---

## 二、核心理念

### 2.1 核心概念

```
函数（原子能力）
  ↓
虚拟对象（按操作目标组织的函数集合）
  ↓
业务场景（实际使用）
```

### 2.2 设计原则

1. **以对象为核心组织界面**
   - 不是分离 Functions 和 Entities
   - 而是以 Entity（操作对象）为维度组织

2. **函数按对象分类展示**
   - `player.*` → 归类到"玩家对象"
   - `item.*` → 归类到"道具对象"

3. **动态路由和菜单**
   - 函数注册后自动生成路由
   - 自动生成菜单项

4. **统一清晰的入口**
   - 主入口：`/entities`（对象管理）
   - 辅助入口：`/functions`（函数库）

---

## 三、整体架构设计

### 3.1 新的页面结构

```
src/pages/
├── Entities/              # 【核心】对象管理 ⭐
│   ├── Index.tsx          # 对象列表（展示所有虚拟对象）
│   ├── Detail.tsx         # 对象详情（包含的函数、调用、权限）
│   └── Editor.tsx         # 对象编辑器（选择函数、配置操作）
│
├── Functions/             # 【辅助】函数能力库
│   ├── Catalog.tsx        # 函数目录（查看所有原子能力，按对象分类）
│   ├── Detail.tsx         # 函数详情
│   ├── Invoke.tsx         # 单次测试调用
│   └── DynamicInvoker.tsx # 动态函数调用器（通用组件）⭐
│
├── Registry/              # 注册中心
│   ├── Functions.tsx      # 注册新函数（上传Descriptor）
│   ├── Servers.tsx        # Agent管理
│   └── Packs.tsx          # 组件包管理
│
└── Admin/                 # 系统管理
    ├── Permissions.tsx    # 权限管理
    └── Settings.tsx       # 系统设置
```

### 3.2 路由设计（静态路由骨架）

```typescript
// config/routes.ts
export default [
  // 1. 对象管理（主入口）⭐
  {
    path: '/entities',
    name: 'Entities',
    icon: 'apartment',
    access: 'canEntitiesRead',
    routes: [
      {
        path: '/entities',
        redirect: '/entities/list',
      },
      {
        path: '/entities/list',
        name: 'EntityList',
        component: './Entities/Index',
      },
      {
        path: '/entities/create',
        name: 'EntityCreate',
        component: './Entities/Editor',
        access: 'canEntitiesManage',
        hideInMenu: true,
      },
      {
        path: '/entities/:id',
        name: 'EntityDetail',
        component: './Entities/Detail',
        hideInMenu: true,
      },
      {
        path: '/entities/:id/edit',
        name: 'EntityEdit',
        component: './Entities/Editor',
        access: 'canEntitiesManage',
        hideInMenu: true,
      },
    ],
  },

  // 2. 函数能力库（辅助查看）
  {
    path: '/functions',
    name: 'Functions',
    icon: 'api',
    access: 'canFunctionsRead',
    routes: [
      {
        path: '/functions',
        redirect: '/functions/catalog',
      },
      {
        path: '/functions/catalog',
        name: 'FunctionCatalog',
        component: './Functions/Catalog',
      },
      {
        path: '/functions/:id',
        name: 'FunctionDetail',
        component: './Functions/Detail',
        hideInMenu: true,
      },
      {
        path: '/functions/:id/invoke',
        name: 'FunctionInvoke',
        component: './Functions/Invoke',
        hideInMenu: true,
      },
    ],
  },

  // 3. 注册中心
  {
    path: '/registry',
    name: 'Registry',
    icon: 'cloud-server',
    access: 'canRegistryRead',
    routes: [
      {
        path: '/registry/functions',
        name: 'RegistryFunctions',
        component: './Registry/Functions',
      },
      {
        path: '/registry/servers',
        name: 'RegistryServers',
        component: './Registry/Servers',
      },
      {
        path: '/registry/packs',
        name: 'RegistryPacks',
        component: './Registry/Packs',
      },
    ],
  },

  // 4. 系统管理
  {
    path: '/admin',
    name: 'Admin',
    icon: 'setting',
    access: 'canAdmin',
    routes: [
      {
        path: '/admin/permissions',
        name: 'Permissions',
        component: './Admin/Permissions',
      },
    ],
  },

  // 【废弃】旧路由重定向
  { path: '/game/functions', redirect: '/functions/catalog' },
  { path: '/game/component-management', redirect: '/entities/list' },
  { path: '/functions/list', redirect: '/functions/catalog' },
];
```

### 3.3 对比：改进前后

| 改进点 | 之前 | 现在 |
|--------|------|------|
| **主入口** | `/game/functions` 和 `/game/component-management` 分散 | 统一到 `/entities` |
| **函数展示** | 平铺列表，看不出操作目标 | 按对象分类（player/*, item/*） |
| **对象编辑** | 5步骤流程复杂（EntityComposer 29KB） | 左右分栏，直观简洁 |
| **路由结构** | 多套并存，混乱 | 清晰的层级结构 |
| **权限管理** | 分散在各处 | 统一到 `/admin/permissions` |

---

## 四、动态路由系统

### 4.1 问题与目标

**问题**: 当前路由写死在 `config/routes.ts`，函数注册后无法自动生成路由和菜单

**目标**:
- 注册函数 `player.add_currency`
- 自动生成路由 `/functions/player/add_currency`
- 自动生成菜单：玩家管理 > 添加货币
- 自动生成页面：函数调用页面（动态表单）

### 4.2 数据流程

```
┌─────────────────┐
│ 1. 后端注册函数   │
│    player.add    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. 保存到数据库  │
│    functions表  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. 前端登录后请求 │
│    GET /api/v1  │
│    /routes      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. 后端返回路由  │
│    配置（JSON）  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. 前端动态注册  │
│    react-router │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. 动态生成菜单  │
│    ProLayout    │
└─────────────────┘
```

### 4.3 后端实现

#### 4.3.1 新增路由接口

**接口**: `GET /api/v1/routes`

**Handler**:
```go
// croupier/services/server/internal/handler/routes/get_routes_handler.go
package routes

import (
    "net/http"
    "github.com/cuihairu/croupier/services/server/internal/svc"
    "github.com/zeromicro/go-zero/rest/httpx"
)

func GetRoutesHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // 获取用户信息（从 JWT token）
        userID := r.Context().Value("user_id").(string)

        l := logic.NewGetRoutesLogic(r.Context(), svcCtx)
        routes, err := l.GetRoutes(userID)
        if err != nil {
            httpx.ErrorCtx(r.Context(), w, err)
            return
        }

        httpx.OkJsonCtx(r.Context(), w, routes)
    }
}
```

**Logic**:
```go
// croupier/services/server/internal/logic/routes/get_routes_logic.go
package routes

import (
    "context"
    "strings"
    "github.com/cuihairu/croupier/services/server/internal/logic/utils"
    "github.com/cuihairu/croupier/services/server/internal/svc"
)

type GetRoutesLogic struct {
    logx.Logger
    ctx    context.Context
    svcCtx *svc.ServiceContext
}

func (l *GetRoutesLogic) GetRoutes(userID string) ([]interface{}, error) {
    // 1. 获取用户权限
    userPermissions, _ := l.svcCtx.RBAC.GetUserPermissions(l.ctx, userID)

    // 2. 获取所有已启用的函数
    functions, _ := l.svcCtx.FunctionModel.GetEnabledFunctions(l.ctx)

    // 3. 按对象分组
    groupedFunctions := utils.GroupFunctionsByObject(functions)

    // 4. 生成路由配置
    routes := make([]interface{}, 0)

    for objectName, funcs := range groupedFunctions {
        // 创建对象分组路由
        objectRoute := map[string]interface{}{
            "path": "/functions/" + objectName,
            "name": utils.ToPascalCase(objectName) + "Functions",
            "icon": utils.GetObjectIcon(objectName),
            "routes": []interface{}{},
        }

        // 为每个函数生成路由
        for _, func := range funcs {
            // 检查权限
            if !hasPermission(userPermissions, func.ID, "read") {
                continue
            }

            funcRoute := map[string]interface{}{
                "path": "/functions/" + objectName + "/" + func.Name,
                "name": func.DisplayName.Zh,
                "component": "../pages/Functions/DynamicInvoker",
                "hideInMenu": false,
                "meta": map[string]interface{}{
                    "functionId": func.ID,
                    "functionName": func.Name,
                    "displayName": func.DisplayName,
                    "category": func.Category,
                },
            }

            objectRoute["routes"] = append(objectRoute["routes"].([]interface{}), funcRoute)
        }

        routes = append(routes, objectRoute)
    }

    return routes, nil
}

// 按对象分组函数
func GroupFunctionsByObject(functions []Function) map[string][]Function {
    grouped := make(map[string][]Function)
    for _, func := range functions {
        // player.add_currency -> player
        objectName := extractObjectFromFunctionID(func.ID)
        grouped[objectName] = append(grouped[objectName], func)
    }
    return grouped
}

func extractObjectFromFunctionID(functionID string) string {
    parts := strings.Split(functionID, ".")
    if len(parts) > 0 {
        return parts[0]
    }
    return "other"
}
```

#### 4.3.2 响应格式

```json
{
  "code": 0,
  "message": "OK",
  "data": [
    {
      "path": "/functions/player",
      "name": "PlayerFunctions",
      "icon": "user",
      "routes": [
        {
          "path": "/functions/player/get",
          "name": "查询玩家",
          "component": "../pages/Functions/DynamicInvoker",
          "meta": {
            "functionId": "player.get",
            "functionName": "get",
            "displayName": { "zh": "查询玩家", "en": "Get Player" }
          }
        },
        {
          "path": "/functions/player/add_currency",
          "name": "添加货币",
          "component": "../pages/Functions/DynamicInvoker",
          "meta": {
            "functionId": "player.add_currency"
          }
        }
      ]
    },
    {
      "path": "/functions/item",
      "name": "ItemFunctions",
      "icon": "inbox",
      "routes": [...]
    }
  ]
}
```

### 4.4 前端实现

#### 4.4.1 动态路由加载

**修改文件**: `src/app.tsx`

```typescript
import { RunTimeLayoutConfig } from '@umijs/max';
import { request } from '@umijs/max';

// 动态路由状态
let dynamicRoutes: any[] = [];

// 运行时配置
export const onRouteChange: RunTimeLayoutConfig = ({ routes }) => {
  // 合并静态路由和动态路由
  return [...routes, ...dynamicRoutes];
};

// 应用初始化
export async function getInitialState() {
  // 1. 获取用户信息
  const fetchUserInfo = async () => {
    try {
      const res = await request('/api/v1/user/me');
      return res.data;
    } catch (error) {
      return null;
    }
  };

  // 2. 加载动态路由
  const loadDynamicRoutes = async () => {
    try {
      const res = await request('/api/v1/routes');
      dynamicRoutes = res.data || [];
      return dynamicRoutes;
    } catch (error) {
      console.error('Failed to load dynamic routes:', error);
      return [];
    }
  };

  // 如果已登录，加载动态路由
  const userInfo = await fetchUserInfo();
  if (userInfo) {
    await loadDynamicRoutes();
  }

  return {
    fetchUserInfo,
    loadDynamicRoutes,
    userInfo,
  };
}
```

#### 4.4.2 通用函数调用组件

**新建文件**: `src/pages/Functions/DynamicInvoker.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useParams } from '@umijs/max';
import { message } from 'antd';
import { getFunctionDescriptor, invokeFunction } from '@/services/api';
import DynamicForm from '@/components/DynamicForm';

export default function DynamicInvoker() {
  const { '*': functionPath } = useParams<{ '*': string }>();
  // functionPath 格式: player/add_currency

  const [descriptor, setDescriptor] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFunctionDescriptor();
  }, [functionPath]);

  const loadFunctionDescriptor = async () => {
    setLoading(true);
    try {
      // 从路径解析函数ID: player/add_currency -> player.add_currency
      const functionId = functionPath.replace('/', '.');
      const data = await getFunctionDescriptor(functionId);
      setDescriptor(data);
    } catch (error) {
      message.error('加载函数配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const functionId = functionPath.replace('/', '.');
      await invokeFunction(functionId, values);
      message.success('调用成功');
    } catch (error) {
      message.error('调用失败');
    }
  };

  if (loading) {
    return <div>加载中...</div>;
  }

  if (!descriptor) {
    return <div>函数不存在或无权限</div>;
  }

  return (
    <PageContainer
      title={descriptor.display_name?.zh || functionId}
      subTitle={`函数ID: ${functionId}`}
    >
      <ProCard>
        <DynamicForm
          schema={descriptor.parameters}
          onSubmit={handleSubmit}
        />
      </ProCard>
    </PageContainer>
  );
}
```

#### 4.4.3 动态表单组件

**新建文件**: `src/components/DynamicForm/index.tsx`

```typescript
import React from 'react';
import { Form, Button, Space } from 'antd';
import SchemaField from './SchemaField';

interface DynamicFormProps {
  schema: any; // JSON Schema
  onSubmit: (values: any) => void;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ schema, onSubmit }) => {
  const [form] = Form.useForm();

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
    >
      {Object.entries(schema?.properties || {}).map(([fieldName, fieldSchema]: [string, any]) => (
        <SchemaField
          key={fieldName}
          name={fieldName}
          schema={fieldSchema}
          required={schema?.required?.includes(fieldName)}
        />
      ))}

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            提交
          </Button>
          <Button onClick={() => form.resetFields()}>
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default DynamicForm;
```

**SchemaField 组件**: `src/components/DynamicForm/SchemaField.tsx`

```typescript
import React from 'react';
import { Form, Input, InputNumber, Select, Switch } from 'antd';

interface SchemaFieldProps {
  name: string;
  schema: any;
  required?: boolean;
}

const SchemaField: React.FC<SchemaFieldProps> = ({ name, schema, required }) => {
  const { type, title, description, enum: enumValues } = schema;

  const renderField = () => {
    switch (type) {
      case 'string':
        if (enumValues) {
          return (
            <Select>
              {enumValues.map((val: string) => (
                <Select.Option key={val} value={val}>{val}</Select.Option>
              ))}
            </Select>
          );
        }
        return <Input />;

      case 'integer':
      case 'number':
        return <InputNumber style={{ width: '100%' }} />;

      case 'boolean':
        return <Switch />;

      case 'array':
        return <Select mode="tags" />;

      default:
        return <Input />;
    }
  };

  return (
    <Form.Item
      name={name}
      label={title || name}
      rules={[{ required: required || false, message: `请输入${title || name}` }]}
      extra={description}
    >
      {renderField()}
    </Form.Item>
  );
};

export default SchemaField;
```

#### 4.4.4 动态菜单生成

**修改文件**: `src/app.tsx`

```typescript
export const layout: RunTimeLayoutConfig = ({ initialState }) => {
  return {
    // 动态菜单配置
    menu: {
      request: async () => {
        // 从后端加载菜单数据
        const res = await request('/api/v1/routes');
        return formatRoutesToMenu(res.data);
      },
    },
  };
};

// 将路由数据转换为菜单格式
function formatRoutesToMenu(routes: any[]) {
  return routes
    .filter(route => !route.hideInMenu)
    .map(route => ({
      path: route.path,
      name: route.name,
      icon: route.icon,
      routes: route.routes ? formatRoutesToMenu(route.routes) : undefined,
    }));
}
```

### 4.5 权限过滤

#### 后端权限过滤

```go
func (l *GetRoutesLogic) GetRoutes(userID string) ([]interface{}, error) {
    // 1. 获取用户权限
    permissions, _ := l.svcCtx.RBAC.GetUserPermissions(l.ctx, userID)

    // 2. 获取所有函数
    functions, _ := l.svcCtx.FunctionModel.GetAll(l.ctx)

    // 3. 过滤：只返回用户有权限的函数
    authorizedFunctions := filterByPermissions(functions, permissions)

    // 4. 生成路由
    return generateRoutes(authorizedFunctions), nil
}
```

#### 前端权限校验

```typescript
// src/access.ts
export default (initialState: { userInfo?: any } | undefined) => {
  const { userInfo } = initialState ?? {};
  return {
    canFunctionsRead: userInfo?.permissions?.includes('functions:read'),
    canFunctionsManage: userInfo?.permissions?.includes('functions:manage'),
    // 动态权限
    canInvokeFunction: (functionId: string) => {
      return userInfo?.functionPermissions?.includes(`${functionId}:invoke`);
    },
  };
};
```

---

## 五、页面设计

### 5.1 Entities/Index.tsx - 对象列表（主入口）

**核心**: 展示所有虚拟对象，每个对象 = 一组操作同个目标的函数

```typescript
<PageContainer
  title="对象管理"
  subtitle="管理虚拟对象及其关联的函数操作"
  extra={[
    <Button type="primary" icon={<PlusOutlined />}>
      创建对象
    </Button>,
  ]}
>
  <Row gutter={16}>
    {/* 左侧：对象分类 */}
    <Col span={4}>
      <Card title="对象分类">
        <Menu
          mode="inline"
          items={[
            { key: 'all', label: '全部对象' },
            { type: 'divider' },
            { key: 'player', label: '玩家对象', icon: <UserOutlined /> },
            { key: 'item', label: '道具对象', icon: <InboxOutlined /> },
            { key: 'quest', label: '任务对象', icon: <FileTextOutlined /> },
          ]}
        />
      </Card>
    </Col>

    {/* 右侧：对象列表 */}
    <Col span={20}>
      <ProTable
        columns={[
          {
            title: '对象信息',
            render: (_, record) => (
              <Space direction="vertical" size={0}>
                <strong>{record.name}</strong>
                <Text type="secondary">{record.id}</Text>
              </Space>
            )
          },
          {
            title: '包含的操作',
            render: (_, record) => (
              <Space wrap>
                {record.operations?.slice(0, 3).map(op => (
                  <Tag key={op.id} color="blue">{op.name}</Tag>
                ))}
                {record.operations?.length > 3 && <Tag>+{record.operations.length - 3}</Tag>}
              </Space>
            )
          },
          {
            title: '关联函数',
            render: (_, record) => (
              <Tag color="green">{record.operations?.length} 个函数</Tag>
            )
          },
          { title: '使用次数', dataIndex: 'usageCount' },
          {
            title: '操作',
            render: (_, record) => (
              <Space>
                <Button size="small">查看</Button>
                <Button size="small">编辑</Button>
              </Space>
            )
          }
        ]}
      />
    </Col>
  </Row>
</PageContainer>
```

### 5.2 Functions/Catalog.tsx - 函数目录（按对象分类）

**核心**: 函数按操作目标对象分组展示

```typescript
<PageContainer
  title="函数能力库"
  subtitle="查看所有已注册的函数，按操作对象分类"
>
  <Row gutter={16}>
    {/* 左侧：对象筛选 */}
    <Col span={4}>
      <Card title="操作对象">
        <Menu
          mode="inline"
          items={[
            { key: 'all', label: '全部函数' },
            { type: 'divider' },
            { key: 'player', label: '玩家 (player.*)' },
            { key: 'item', label: '道具 (item.*)' },
            { key: 'quest', label: '任务 (quest.*)' },
          ]}
        />
      </Card>
    </Col>

    {/* 右侧：函数列表 */}
    <Col span={20}>
      <ProTable
        columns={[
          { title: '函数', render: (_, record) => <strong>{record.display_name?.zh}</strong> },
          {
            title: '操作对象',
            render: (_, record) => {
              const target = record.id.split('.')[0];
              return <Tag color="blue">{target}</Tag>;
            }
          },
          { title: '描述', dataIndex: 'summary.zh' },
          { title: '状态', render: () => <Badge status="success" text="启用" /> },
          {
            title: '操作',
            render: (_, record) => (
              <Space>
                <Button size="small">详情</Button>
                <Button size="small">创建对象</Button>
              </Space>
            )
          }
        ]}
      />
    </Col>
  </Row>
</PageContainer>
```

### 5.3 Entities/Editor.tsx - 对象编辑器（简化版）

**核心**: 左右分栏，左侧选函数，右侧配置操作

```typescript
<PageContainer
  title={isEditMode ? "编辑对象" : "创建对象"}
  extra={[
    <Button onClick={() => history.back()}>取消</Button>,
    <Button type="primary" onClick={handleSave}>保存</Button>,
  ]}
>
  <Alert
    message="什么是虚拟对象？"
    description="虚拟对象是一组操作同一个目标对象的函数集合。例如：'玩家对象'包含 player.get、player.update、player.add_currency 等所有操作玩家的函数。"
    type="info"
    showIcon
    style={{ marginBottom: 16 }}
  />

  <Row gutter={16}>
    {/* 左侧：基本信息 + 函数选择 */}
    <Col span={8}>
      <Card title="1. 基本信息" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="对象名称" required>
            <Input placeholder="如：玩家对象" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Card>

      <Card title="2. 选择函数">
        <Transfer
          dataSource={availableFunctions}
          targetKeys={selectedFunctions}
          onChange={setSelectedFunctions}
          render={(item) => (
            <div>
              <div><strong>{item.display_name?.zh}</strong></div>
              <div><Text type="secondary">{item.id}</Text></div>
            </div>
          )}
        />
      </Card>
    </Col>

    {/* 右侧：操作配置 */}
    <Col span={16}>
      <Card title="3. 配置操作">
        {selectedFunctions.length === 0 ? (
          <Empty description="请从左侧选择函数" />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {selectedFunctions.map(funcId => {
              const func = availableFunctions.find(f => f.key === funcId);
              return (
                <Card key={funcId} size="small" title={<Tag color="blue">{func?.id}</Tag>}>
                  <Form layout="vertical">
                    <Form.Item label="操作名称" required>
                      <Input placeholder="如：查询玩家" />
                    </Form.Item>
                    <Form.Item label="操作描述">
                      <Input placeholder="描述此操作" />
                    </Form.Item>
                  </Form>
                </Card>
              );
            })}
          </Space>
        )}
      </Card>
    </Col>
  </Row>
</PageContainer>
```

---

## 六、权限设计

### 6.1 权限层级

```
全局权限
  ↓
模块权限
  - entities:read    （查看对象）
  - entities:manage  （创建/编辑对象）
  - functions:read   （查看函数）
  - functions:manage （注册/删除函数）
  ↓
资源权限
  - function:{function_id}:read
  - entity:{entity_id}:write
```

### 6.2 权限码定义

```typescript
const permissions = {
  // 对象管理
  'entities:read': '查看对象列表',
  'entities:manage': '创建/编辑/删除对象',

  // 函数查看
  'functions:read': '查看函数目录',
  'functions:manage': '注册/删除函数',

  // 注册中心
  'registry:read': '查看注册中心',
  'registry:manage': '管理注册内容',

  // 系统管理
  'admin:*': '系统管理员',
};
```

### 6.3 路由权限映射

```typescript
// config/routes.ts
{
  path: '/entities',
  access: 'canEntitiesRead',
  routes: [
    {
      path: '/entities/create',
      access: 'canEntitiesManage',
    }
  ]
}
```

---

## 七、实施计划

### Phase 1: 清理旧界面（1周）

**目标**: 移除重复界面，统一入口

**任务**:
1. 删除 `GmFunctions/*` 和 `Functions/index.tsx`
2. 重定向旧路由到新入口
3. 更新导航菜单
4. 更新内部链接引用

**验收**:
- 所有旧路由重定向到新入口
- 导航菜单只显示新入口
- 无404错误

### Phase 2: 后端动态路由（2周）

**目标**: 实现动态路由生成接口

**任务**:
1. 创建 `GET /api/v1/routes` 接口
2. 实现按对象分组函数的逻辑
3. 实现权限过滤逻辑
4. 编写单元测试

**文件**:
- `internal/handler/routes/get_routes_handler.go`
- `internal/logic/routes/get_routes_logic.go`
- `internal/logic/utils/routes_helper.go`

**验收**:
- 接口返回正确格式的路由配置
- 权限过滤正确
- 单元测试覆盖率 > 80%

### Phase 3: 前端动态路由（2周）

**目标**: 实现前端动态路由加载和菜单生成

**任务**:
1. 修改 `app.tsx` 支持动态路由加载
2. 创建 `DynamicInvoker` 通用调用组件
3. 创建 `DynamicForm` 动态表单组件
4. 创建 `SchemaField` 表单字段组件

**文件**:
- `src/app.tsx`
- `src/pages/Functions/DynamicInvoker.tsx`
- `src/components/DynamicForm/index.tsx`
- `src/components/DynamicForm/SchemaField.tsx`

**验收**:
- 登录后动态路由加载成功
- 菜单自动生成
- 动态表单正确渲染

### Phase 4: 新页面创建（2周）

**目标**: 创建核心页面

**任务**:
1. 创建 `Entities/Index.tsx`（对象列表）
2. 创建 `Entities/Detail.tsx`（对象详情）
3. 简化 `Entities/Editor.tsx`（对象编辑器）
4. 创建 `Functions/Catalog.tsx`（函数目录）

**验收**:
- 所有页面正常渲染
- 数据交互正确
- 无明显bug

### Phase 5: API统一（1周）

**目标**: 统一API层

**任务**:
1. 统一使用 `functions-enhanced.ts`
2. 添加函数按对象分组的API
3. 更新TypeScript类型定义
4. 废弃旧API

**验收**:
- 所有调用使用新API
- 类型定义正确
- 无类型错误

### Phase 6: 权限整合（1周）

**目标**: 完善权限系统

**任务**:
1. 创建 `Admin/Permissions.tsx`
2. 配置角色权限矩阵
3. 测试权限控制
4. 文档编写

**验收**:
- 权限控制正确
- 角色管理功能完善
- 文档完整

### Phase 7: 测试优化（1周）

**目标**: 全面测试和优化

**任务**:
1. 功能测试
2. 性能测试
3. UI/UX优化
4. Bug修复

**验收**:
- 所有功能正常
- 性能达标
- 用户体验良好

---

## 八、技术债务清单

### 高优先级 🔴

1. **废弃旧版函数管理**
   - 文件: `GmFunctions/*`, `Functions/index.tsx`
   - 工作量: 2天
   - 影响: 用户使用习惯

2. **统一API层**
   - 文件: `functions.ts` → `functions-enhanced.ts`
   - 工作量: 3天
   - 影响: 所有调用处需更新

3. **重构EntityComposer**
   - 文件: `EntityComposer.tsx` (29KB)
   - 工作量: 5天
   - 影响: 编辑流程

### 中优先级 🟡

4. **简化路由配置**
   - 文件: `config/routes.ts`
   - 工作量: 1天
   - 影响: 导航菜单

5. **统一权限管理**
   - 文件: `Functions/Detail.tsx`, 权限相关
   - 工作量: 4天
   - 影响: 权限配置流程

### 低优先级 🟢

6. **优化函数调用界面**
   - 文件: `Functions/Invoke/*`, `FunctionWorkspace.tsx`
   - 工作量: 2天
   - 影响: 用户操作习惯

7. **完善文档**
   - 文件: `docs/*`, README
   - 工作量: 3天
   - 影响: 新用户上手

---

## 附录

### A. 参考文档

- [Umi Max 动态路由](https://umijs.org/docs/max/route#动态路由)
- [Ant Design Pro 布局](https://procomponents.ant.design/components/layout)
- [JSON Schema 规范](https://json-schema.org/)

### B. 相关Issue

- #TODO: 链接到项目Issue

### C. 变更历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| v1.0 | 2025-02-01 | Claude | 初始版本 |

---

**文档状态**: ✅ 待审核
**下一步**: 开始Phase 1实施
