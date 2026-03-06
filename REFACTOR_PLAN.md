# 重构计划：改造 Workspace 为自动生成的管理界面

**分支**: `feature/core-v2-prototype` **目标**: 让 Workspace 根据注册的函数自动生成完整的 CRUD 界面

---

## 🎯 核心目标

### 现状

```
/console/user → Workspace Detail 页面
  ├── 显示所有 user.* 函数
  ├── 手动输入 JSON 调用函数
  └── 只是一个"调用工具"
```

### 目标

```
/console/user → 自动生成的用户管理界面
  ├── 列表页（自动识别 user.list）
  ├── 创建按钮 → 表单（自动识别 user.create）
  ├── 编辑按钮 → 表单（自动识别 user.update）
  ├── 删除按钮（自动识别 user.delete）
  └── 详情页（自动识别 user.get）
```

---

## 📋 实施步骤

### Step 1: 分析现有 Workspace 数据结构

**查看现有代码**：

- `src/pages/Workspaces/Detail.tsx` - 当前实现
- `src/features/workspaces/model.ts` - Workspace 数据模型
- `src/services/api/index.ts` - 函数描述符

**理解数据结构**：

```typescript
// FunctionDescriptor
{
  id: 'user.list',
  name: 'list',
  object: 'user',
  input_schema: {...},
  output_schema: {...},
  // ...
}

// Workspace
{
  key: 'user',
  title: '用户',
  operations: [
    { id: 'user.list', name: 'list', ... },
    { id: 'user.create', name: 'create', ... },
    { id: 'user.update', name: 'update', ... },
    { id: 'user.delete', name: 'delete', ... },
    { id: 'user.get', name: 'get', ... },
  ]
}
```

---

### Step 2: 编写函数识别逻辑

**目标**：根据函数名自动识别函数类型

```typescript
// src/components/PageGenerator/utils/functionAnalyzer.ts

/**
 * 分析函数类型
 */
export function analyzeFunctionType(functionName: string): FunctionType {
  const name = functionName.toLowerCase();

  if (name.includes('list') || name.includes('query') || name.includes('search')) {
    return 'list';
  }
  if (name.includes('create') || name.includes('add') || name.includes('new')) {
    return 'create';
  }
  if (name.includes('update') || name.includes('edit') || name.includes('patch')) {
    return 'update';
  }
  if (name.includes('delete') || name.includes('remove')) {
    return 'delete';
  }
  if (name.includes('get') || name.includes('detail') || name.includes('read')) {
    return 'detail';
  }

  return 'unknown';
}

/**
 * 从 Workspace 生成页面配置
 */
export function generatePageConfigFromWorkspace(workspace: Workspace): PageConfig {
  const operations = workspace.operations;

  // 查找各类函数
  const listFunc = operations.find((op) => analyzeFunctionType(op.name) === 'list');
  const createFunc = operations.find((op) => analyzeFunctionType(op.name) === 'create');
  const updateFunc = operations.find((op) => analyzeFunctionType(op.name) === 'update');
  const deleteFunc = operations.find((op) => analyzeFunctionType(op.name) === 'delete');
  const detailFunc = operations.find((op) => analyzeFunctionType(op.name) === 'detail');

  // 如果有 list 函数，生成列表页配置
  if (listFunc) {
    return generateListPageConfig(workspace, listFunc, {
      createFunc,
      updateFunc,
      deleteFunc,
      detailFunc,
    });
  }

  // 如果没有 list，但有 detail，生成详情页
  if (detailFunc) {
    return generateDetailPageConfig(workspace, detailFunc);
  }

  // 否则，返回原来的调用界面配置
  return generateInvokePageConfig(workspace);
}

/**
 * 生成列表页配置
 */
function generateListPageConfig(
  workspace: Workspace,
  listFunc: FunctionDescriptor,
  actions: {
    createFunc?: FunctionDescriptor;
    updateFunc?: FunctionDescriptor;
    deleteFunc?: FunctionDescriptor;
    detailFunc?: FunctionDescriptor;
  },
): PageConfig {
  // 从 output_schema 推断列配置
  const columns = inferColumnsFromSchema(listFunc.output_schema);

  // 生成操作按钮
  const pageActions: ActionConfig[] = [];
  if (actions.createFunc) {
    pageActions.push({
      key: 'create',
      label: '新建',
      type: 'primary',
      icon: 'PlusOutlined',
      onClick: {
        type: 'modal',
        modal: {
          title: `新建${workspace.title}`,
          content: generateFormPageConfig(workspace, actions.createFunc),
        },
      },
    });
  }

  // 生成行操作
  const rowActions: RowActionConfig[] = [];
  if (actions.updateFunc) {
    rowActions.push({
      key: 'edit',
      label: '编辑',
      icon: 'EditOutlined',
      onClick: {
        type: 'modal',
        modal: {
          title: `编辑${workspace.title}`,
          content: generateFormPageConfig(workspace, actions.updateFunc),
        },
      },
    });
  }
  if (actions.deleteFunc) {
    rowActions.push({
      key: 'delete',
      label: '删除',
      icon: 'DeleteOutlined',
      danger: true,
      confirm: {
        title: '确认删除',
        content: '删除后无法恢复，确认删除吗？',
      },
      onClick: {
        type: 'function',
        functionId: actions.deleteFunc.id,
        onSuccess: {
          message: '删除成功',
          refresh: true,
        },
      },
    });
  }

  return {
    id: `${workspace.key}-list`,
    type: 'list',
    title: workspace.title,
    path: `/console/${workspace.key}`,
    dataSource: {
      type: 'function',
      functionId: listFunc.id,
    },
    ui: {
      list: {
        columns,
        actions: pageActions,
        rowActions,
        pagination: true,
      },
    },
  };
}

/**
 * 从 Schema 推断列配置
 */
function inferColumnsFromSchema(schema: any): ColumnConfig[] {
  // 如果是数组类型，取第一个元素的 schema
  let itemSchema = schema;
  if (schema?.type === 'array' && schema.items) {
    itemSchema = schema.items;
  }

  // 如果是对象类型，遍历属性
  if (itemSchema?.type === 'object' && itemSchema.properties) {
    const columns: ColumnConfig[] = [];

    Object.entries(itemSchema.properties).forEach(([key, prop]: [string, any]) => {
      const column: ColumnConfig = {
        key,
        title: prop.title || key,
        width: 150,
      };

      // 根据类型推断渲染方式
      if (prop.type === 'boolean') {
        column.render = 'status';
      } else if (prop.format === 'date-time') {
        column.render = 'datetime';
      } else if (prop.format === 'date') {
        column.render = 'date';
      } else if (prop.enum) {
        column.render = 'tag';
      }

      columns.push(column);
    });

    return columns;
  }

  // 默认返回 ID 列
  return [{ key: 'id', title: 'ID', width: 80 }];
}

/**
 * 生成表单页配置
 */
function generateFormPageConfig(workspace: Workspace, func: FunctionDescriptor): PageConfig {
  // 从 input_schema 生成表单字段
  const fields = inferFieldsFromSchema(func.input_schema);

  return {
    id: `${workspace.key}-${func.name}`,
    type: 'form',
    title: `${workspace.title} - ${func.name}`,
    path: `/console/${workspace.key}/${func.name}`,
    dataSource: {
      type: 'function',
      functionId: func.id,
    },
    ui: {
      form: {
        fields,
        layout: 'horizontal',
        submitText: '提交',
      },
    },
  };
}

/**
 * 从 Schema 推断表单字段
 */
function inferFieldsFromSchema(schema: any): FormFieldConfig[] {
  if (!schema?.properties) return [];

  const fields: FormFieldConfig[] = [];
  const required = schema.required || [];

  Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
    const field: FormFieldConfig = {
      key,
      label: prop.title || key,
      type: 'input',
      required: required.includes(key),
      placeholder: prop.description,
    };

    // 根据类型推断字段类型
    if (prop.type === 'boolean') {
      field.type = 'switch';
    } else if (prop.type === 'number' || prop.type === 'integer') {
      field.type = 'number';
    } else if (prop.enum) {
      field.type = 'select';
      field.options = prop.enum.map((value: any) => ({
        label: value,
        value,
      }));
    } else if (prop.format === 'date-time' || prop.format === 'date') {
      field.type = 'date';
    } else if (prop.maxLength && prop.maxLength > 100) {
      field.type = 'textarea';
    }

    fields.push(field);
  });

  return fields;
}
```

---

### Step 3: 改造 Workspace Detail 页面

```typescript
// src/pages/Workspaces/Detail.tsx

import { generatePageConfigFromWorkspace } from '@/components/PageGenerator/utils/functionAnalyzer';
import PageGenerator from '@/components/PageGenerator';

export default function WorkspaceDetailPage() {
  const params = useParams<{ objectKey: string }>();
  const objectKey = decodeURIComponent(String(params?.objectKey || '')).toLowerCase();

  const [loading, setLoading] = useState(false);
  const [descriptors, setDescriptors] = useState<FunctionDescriptor[]>([]);
  const { initialState } = useModel('@@initialState');

  // 加载函数描述符（保持不变）
  useEffect(() => {
    // ... 现有的加载逻辑
  }, []);

  const workspaces = useMemo(() => buildWorkspaceObjects(descriptors), [descriptors]);
  const workspace = useMemo(
    () => workspaces.find((item) => item.key.toLowerCase() === objectKey),
    [workspaces, objectKey],
  );

  if (!workspace) return <Empty description="对象不存在或暂无可执行操作" />;

  // ========== 新增：生成页面配置 ==========
  const pageConfig = useMemo(() => {
    return generatePageConfigFromWorkspace(workspace);
  }, [workspace]);

  // ========== 使用 PageGenerator 渲染 ==========
  return <PageGenerator config={pageConfig} />;
}
```

---

### Step 4: 测试效果

**测试步骤**：

1. 启动项目
2. 访问 `/console/user`（假设有 user 对象）
3. 查看是否自动生成了列表页
4. 测试创建、编辑、删除功能

**预期效果**：

- ✅ 自动显示用户列表
- ✅ 有"新建"按钮
- ✅ 每行有"编辑"、"删除"按钮
- ✅ 点击"新建"弹出表单
- ✅ 表单字段自动生成
- ✅ 提交后刷新列表

---

## 🎯 优势

### 1. 保留现有概念

- ✅ Workspace 概念保留
- ✅ 路由不变（`/console/:objectKey`）
- ✅ 函数注册机制不变

### 2. 自动化程度更高

```
注册函数：
  user.list
  user.create
  user.update
  user.delete

自动生成：
  ✅ 完整的用户管理界面
  ✅ 列表 + 表单 + 操作按钮
  ✅ 无需任何配置
```

### 3. 渐进式改造

- 先改造 Workspace
- 其他页面保持不变
- 逐步迁移

---

## 📅 时间计划

### Week 1: 改造 Workspace

**Day 1-2**: 编写函数分析逻辑

- `functionAnalyzer.ts`
- `generatePageConfigFromWorkspace`
- `inferColumnsFromSchema`
- `inferFieldsFromSchema`

**Day 3-4**: 改造 Workspace Detail

- 修改 `src/pages/Workspaces/Detail.tsx`
- 集成 PageGenerator
- 测试效果

**Day 5**: 完善功能

- 处理边界情况
- 优化用户体验
- 修复 Bug

**Day 6-7**: 测试和文档

- 完整测试
- 编写文档
- 准备演示

---

## 🚀 下一步

让我开始实施：

1. **创建 functionAnalyzer.ts**
2. **改造 Workspace Detail**
3. **测试效果**

准备好了吗？
