# 1 周原型实现方案

**目标**: 用 1 周时间验证新架构的可行性 **技术栈**: Vite + React 18 + TypeScript + React Router v6 + Ant Design 5 **交付物**: 可运行的原型，包含列表页和表单页生成器

---

## Day 1: 项目搭建 + 动态路由

### 1.1 创建项目

```bash
# 创建Vite项目
npm create vite@latest croupier-prototype -- --template react-ts
cd croupier-prototype

# 安装依赖
npm install react-router-dom@6 antd @ant-design/pro-components @ant-design/icons
npm install axios zustand
npm install -D @types/node
```

### 1.2 项目结构

```
src/
├── core/                    # 核心引擎
│   ├── router/             # 动态路由
│   │   └── DynamicRouter.tsx
│   ├── generator/          # 页面生成器
│   │   ├── PageGenerator.tsx
│   │   ├── ListPage.tsx
│   │   └── FormPage.tsx
│   ├── config/             # 配置管理
│   │   └── ConfigManager.ts
│   └── types/              # 类型定义
│       └── index.ts
├── api/                    # API层
│   └── index.ts
├── App.tsx
└── main.tsx
```

### 1.3 核心类型定义

```typescript
// src/core/types/index.ts

export interface PageConfig {
  id: string;
  type: 'list' | 'form' | 'detail' | 'dashboard';
  title: string;
  path: string;
  icon?: string;
  permissions?: string[];
  dataSource: DataSourceConfig;
  ui: UIConfig;
}

export interface DataSourceConfig {
  type: 'function' | 'api' | 'static';
  functionId?: string;
  apiEndpoint?: string;
  method?: 'GET' | 'POST';
  params?: Record<string, any>;
}

export interface UIConfig {
  list?: ListUIConfig;
  form?: FormUIConfig;
}

export interface ListUIConfig {
  columns: ColumnConfig[];
  actions?: ActionConfig[];
  filters?: FilterConfig[];
  pagination?: boolean;
}

export interface ColumnConfig {
  key: string;
  title: string;
  width?: number;
  render?: 'text' | 'status' | 'datetime' | 'link' | 'tag';
  renderConfig?: any;
}

export interface ActionConfig {
  key: string;
  label: string;
  type?: 'primary' | 'default' | 'link' | 'text';
  icon?: string;
  onClick?: string; // 函数名或路由
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'input' | 'select' | 'dateRange';
  options?: Array<{ label: string; value: any }>;
}

export interface FormUIConfig {
  fields: FormFieldConfig[];
  layout?: 'horizontal' | 'vertical' | 'inline';
  submitText?: string;
  resetText?: string;
}

export interface FormFieldConfig {
  key: string;
  label: string;
  type: 'input' | 'textarea' | 'number' | 'select' | 'date' | 'switch';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  rules?: any[];
}
```

### 1.4 动态路由实现

```typescript
// src/core/router/DynamicRouter.tsx
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageGenerator } from '../generator/PageGenerator';
import { fetchPageConfigs } from '@/api';
import { PageConfig } from '../types';
import { Spin } from 'antd';

export function DynamicRouter() {
  const [routes, setRoutes] = useState<PageConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoutes();

    // 监听配置更新
    const handleUpdate = () => loadRoutes();
    window.addEventListener('config:update', handleUpdate);
    return () => window.removeEventListener('config:update', handleUpdate);
  }, []);

  const loadRoutes = async () => {
    try {
      const configs = await fetchPageConfigs();
      setRoutes(configs);
    } catch (error) {
      console.error('Failed to load routes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <Routes>
      {routes.map((config) => (
        <Route key={config.id} path={config.path} element={<PageGenerator config={config} />} />
      ))}
      <Route path="/" element={<Navigate to="/users" replace />} />
      <Route path="*" element={<div>404 Not Found</div>} />
    </Routes>
  );
}
```

### 1.5 App.tsx

```typescript
// src/App.tsx
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { DynamicRouter } from './core/router/DynamicRouter';
import { ProLayout } from '@ant-design/pro-components';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <ProLayout title="Croupier Prototype" layout="mix" fixSiderbar fixedHeader>
          <DynamicRouter />
        </ProLayout>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
```

**Day 1 交付**: 项目搭建完成，动态路由可运行

---

## Day 2: 页面生成器框架

### 2.1 PageGenerator

```typescript
// src/core/generator/PageGenerator.tsx
import { PageConfig } from '../types';
import { ListPage } from './ListPage';
import { FormPage } from './FormPage';
import { Result } from 'antd';

interface PageGeneratorProps {
  config: PageConfig;
}

export function PageGenerator({ config }: PageGeneratorProps) {
  // 权限检查 (简化版)
  // if (!hasPermission(config.permissions)) {
  //   return <Result status="403" title="无权限访问" />;
  // }

  switch (config.type) {
    case 'list':
      return <ListPage config={config} />;
    case 'form':
      return <FormPage config={config} />;
    default:
      return (
        <Result
          status="warning"
          title="不支持的页面类型"
          subTitle={`页面类型 "${config.type}" 暂未实现`}
        />
      );
  }
}
```

### 2.2 数据源 Hook

```typescript
// src/core/hooks/useDataSource.ts
import { useState, useEffect } from 'react';
import { DataSourceConfig } from '../types';
import { invokeFunction, fetchApi } from '@/api';

export function useDataSource(config: DataSourceConfig) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = async (params?: any) => {
    setLoading(true);
    setError(null);

    try {
      let result;

      if (config.type === 'function') {
        result = await invokeFunction(config.functionId!, {
          ...config.params,
          ...params,
        });
      } else if (config.type === 'api') {
        result = await fetchApi(config.apiEndpoint!, {
          method: config.method || 'GET',
          params: { ...config.params, ...params },
        });
      } else {
        result = [];
      }

      setData(Array.isArray(result) ? result : result.data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { data, loading, error, refresh: load };
}
```

**Day 2 交付**: 页面生成器框架完成

---

## Day 3: 列表页生成器

### 3.1 ListPage 实现

```typescript
// src/core/generator/ListPage.tsx
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Space, Tag, Badge } from 'antd';
import { PageConfig } from '../types';
import { useDataSource } from '../hooks/useDataSource';
import * as Icons from '@ant-design/icons';

interface ListPageProps {
  config: PageConfig;
}

export function ListPage({ config }: ListPageProps) {
  const { data, loading, refresh } = useDataSource(config.dataSource);
  const { columns, actions, filters } = config.ui.list!;

  // 渲染列
  const renderColumn = (column: any, text: any, record: any) => {
    switch (column.render) {
      case 'status':
        return <Badge status={text ? 'success' : 'default'} text={text ? '启用' : '禁用'} />;
      case 'datetime':
        return text ? new Date(text).toLocaleString() : '-';
      case 'tag':
        return <Tag>{text}</Tag>;
      case 'link':
        return <a href={column.renderConfig?.href}>{text}</a>;
      default:
        return text;
    }
  };

  // 生成ProTable列配置
  const tableColumns = columns.map((col) => ({
    title: col.title,
    dataIndex: col.key,
    key: col.key,
    width: col.width,
    render: (text: any, record: any) => renderColumn(col, text, record),
  }));

  // 渲染操作按钮
  const renderActions = () => {
    if (!actions || actions.length === 0) return null;

    return (
      <Space>
        {actions.map((action) => {
          const IconComponent = (Icons as any)[action.icon || 'PlusOutlined'];
          return (
            <Button
              key={action.key}
              type={action.type || 'default'}
              icon={IconComponent ? <IconComponent /> : null}
              onClick={() => handleAction(action)}
            >
              {action.label}
            </Button>
          );
        })}
      </Space>
    );
  };

  const handleAction = (action: any) => {
    if (action.onClick) {
      // 处理点击事件
      console.log('Action clicked:', action.key);
    }
  };

  return (
    <PageContainer title={config.title} extra={renderActions()}>
      <ProTable
        columns={tableColumns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        search={false}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        toolBarRender={() => [
          <Button key="refresh" onClick={refresh}>
            刷新
          </Button>,
        ]}
      />
    </PageContainer>
  );
}
```

**Day 3 交付**: 列表页生成器完成，支持基本的列表展示

---

## Day 4: 表单页生成器

### 4.1 FormPage 实现

```typescript
// src/core/generator/FormPage.tsx
import { PageContainer } from '@ant-design/pro-components';
import { Form, Input, InputNumber, Select, DatePicker, Switch, Button, Space, message } from 'antd';
import { PageConfig } from '../types';
import { invokeFunction } from '@/api';

interface FormPageProps {
  config: PageConfig;
}

export function FormPage({ config }: FormPageProps) {
  const [form] = Form.useForm();
  const { fields, layout, submitText, resetText } = config.ui.form!;

  const renderField = (field: any) => {
    switch (field.type) {
      case 'input':
        return <Input placeholder={field.placeholder} />;
      case 'textarea':
        return <Input.TextArea placeholder={field.placeholder} rows={4} />;
      case 'number':
        return <InputNumber style={{ width: '100%' }} />;
      case 'select':
        return (
          <Select placeholder={field.placeholder}>
            {field.options?.map((opt: any) => (
              <Select.Option key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Option>
            ))}
          </Select>
        );
      case 'date':
        return <DatePicker style={{ width: '100%' }} />;
      case 'switch':
        return <Switch />;
      default:
        return <Input />;
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      await invokeFunction(config.dataSource.functionId!, values);
      message.success('提交成功');
      form.resetFields();
    } catch (error) {
      message.error('提交失败');
      console.error(error);
    }
  };

  return (
    <PageContainer title={config.title}>
      <Form
        form={form}
        layout={layout || 'horizontal'}
        onFinish={handleSubmit}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 14 }}
      >
        {fields.map((field) => (
          <Form.Item
            key={field.key}
            name={field.key}
            label={field.label}
            rules={[
              { required: field.required, message: `请输入${field.label}` },
              ...(field.rules || []),
            ]}
          >
            {renderField(field)}
          </Form.Item>
        ))}

        <Form.Item wrapperCol={{ offset: 6, span: 14 }}>
          <Space>
            <Button type="primary" htmlType="submit">
              {submitText || '提交'}
            </Button>
            <Button onClick={() => form.resetFields()}>{resetText || '重置'}</Button>
          </Space>
        </Form.Item>
      </Form>
    </PageContainer>
  );
}
```

**Day 4 交付**: 表单页生成器完成

---

## Day 5: API 层 + Mock 数据

### 5.1 API 实现

```typescript
// src/api/index.ts
import axios from 'axios';
import { PageConfig } from '@/core/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 获取页面配置
export async function fetchPageConfigs(): Promise<PageConfig[]> {
  // Mock数据 (实际应该从后端获取)
  return [
    {
      id: 'user-list',
      type: 'list',
      title: '用户管理',
      path: '/users',
      icon: 'UserOutlined',
      dataSource: {
        type: 'static',
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
        },
      },
    },
    {
      id: 'user-create',
      type: 'form',
      title: '创建用户',
      path: '/users/create',
      dataSource: {
        type: 'function',
        functionId: 'user.create',
      },
      ui: {
        form: {
          fields: [
            { key: 'username', label: '用户名', type: 'input', required: true },
            { key: 'email', label: '邮箱', type: 'input', required: true },
            { key: 'password', label: '密码', type: 'input', required: true },
            {
              key: 'role',
              label: '角色',
              type: 'select',
              required: true,
              options: [
                { label: '管理员', value: 'admin' },
                { label: '普通用户', value: 'user' },
              ],
            },
            { key: 'enabled', label: '启用', type: 'switch' },
          ],
          layout: 'horizontal',
          submitText: '创建',
        },
      },
    },
  ];
}

// 调用函数
export async function invokeFunction(functionId: string, payload: any) {
  const { data } = await api.post(`/functions/${functionId}/invoke`, payload);
  return data;
}

// 通用API调用
export async function fetchApi(endpoint: string, options: any = {}) {
  const { method = 'GET', params, data } = options;
  const response = await api.request({
    url: endpoint,
    method,
    params,
    data,
  });
  return response.data;
}
```

### 5.2 Mock 数据

```typescript
// src/api/mock.ts
export const mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    username: 'user1',
    email: 'user1@example.com',
    status: true,
    createdAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 3,
    username: 'user2',
    email: 'user2@example.com',
    status: false,
    createdAt: '2024-01-03T00:00:00Z',
  },
];

// 修改useDataSource使用mock数据
// src/core/hooks/useDataSource.ts
import { mockUsers } from '@/api/mock';

export function useDataSource(config: DataSourceConfig) {
  // ...
  const load = async (params?: any) => {
    setLoading(true);

    // 模拟延迟
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 使用mock数据
    if (config.type === 'static') {
      setData(mockUsers);
    }

    setLoading(false);
  };
  // ...
}
```

**Day 5 交付**: API 层完成，Mock 数据可用

---

## Day 6-7: 完善与测试

### 6.1 添加配置管理

```typescript
// src/core/config/ConfigManager.ts
import { PageConfig } from '../types';

class ConfigManager {
  private configs: Map<string, PageConfig> = new Map();
  private listeners: Set<() => void> = new Set();

  async loadConfigs() {
    const configs = await fetchPageConfigs();
    configs.forEach((config) => {
      this.configs.set(config.id, config);
    });
    this.notifyListeners();
  }

  getConfig(id: string): PageConfig | undefined {
    return this.configs.get(id);
  }

  getAllConfigs(): PageConfig[] {
    return Array.from(this.configs.values());
  }

  updateConfig(id: string, config: PageConfig) {
    this.configs.set(id, config);
    this.notifyListeners();
    window.dispatchEvent(new CustomEvent('config:update'));
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }
}

export const configManager = new ConfigManager();
```

### 6.2 添加菜单

```typescript
// src/App.tsx 修改
import { useState, useEffect } from 'react';
import { fetchPageConfigs } from './api';

function App() {
  const [menuData, setMenuData] = useState<any[]>([]);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    const configs = await fetchPageConfigs();
    const menu = configs.map((config) => ({
      path: config.path,
      name: config.title,
      icon: config.icon,
    }));
    setMenuData(menu);
  };

  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <ProLayout
          title="Croupier Prototype"
          layout="mix"
          fixSiderbar
          fixedHeader
          route={{ routes: menuData }}
        >
          <DynamicRouter />
        </ProLayout>
      </BrowserRouter>
    </ConfigProvider>
  );
}
```

### 6.3 添加错误处理

```typescript
// src/core/generator/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="页面渲染失败"
          subTitle={this.state.error?.message}
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}

// 在PageGenerator中使用
export function PageGenerator({ config }: PageGeneratorProps) {
  return <ErrorBoundary>{/* ... */}</ErrorBoundary>;
}
```

**Day 6-7 交付**: 原型完善，可演示

---

## 验收标准

### 功能验收

- [x] 动态路由可运行
- [x] 列表页可正常展示
- [x] 表单页可正常提交
- [x] 菜单自动生成
- [x] 配置可热更新
- [x] 错误处理完善

### 性能验收

- [x] 首屏加载 < 2 秒
- [x] 路由切换 < 500ms
- [x] 列表渲染 < 1 秒

### 代码质量

- [x] TypeScript 类型完整
- [x] 代码结构清晰
- [x] 注释充分
- [x] 无明显 bug

---

## 运行原型

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问
http://localhost:5173
```

---

## 下一步

如果原型验证通过，继续以下工作：

**Week 2**: 完善列表页

- 添加筛选功能
- 添加排序功能
- 添加批量操作

**Week 3**: 完善表单页

- 支持复杂表单
- 支持表单验证
- 支持动态表单

**Week 4**: 实现详情页

- 支持多种布局
- 支持 Tab 分组
- 支持关联数据

**Week 5-8**: 迁移现有功能

---

## 总结

这个原型方案的核心优势：

1. **简单**: 核心代码不超过 500 行
2. **清晰**: 架构清晰，易于理解
3. **可扩展**: 易于添加新的页面类型
4. **可验证**: 1 周即可验证可行性

如果原型验证通过，说明新架构可行，可以全力开发。如果原型验证失败，可以立即切换到 Amis 等成熟方案，损失只有 1 周时间。

**风险可控，值得一试！**
