# Workspace 重构 TODO - Week 2

**阶段**: Phase 1 继续 + Phase 2 开始 **目标**: 完成 Layout Engine 核心渲染器 + 开始可视化编排工具

---

## 🎯 Phase 1 继续: Layout Engine 渲染器（Week 2 前半）

### 1.4 具体渲染器实现

#### 任务 1.4.1: 实现 FormDetailRenderer

**文件**: `src/components/WorkspaceRenderer/renderers/FormDetailRenderer.tsx` **优先级**: P0 **预计时间**: 6 小时 **依赖**: 任务 1.3.3

**详细步骤**:

```typescript
// 1. 创建文件
touch src/components/WorkspaceRenderer/renderers/FormDetailRenderer.tsx

// 2. 实现组件
import React, { useState } from 'react';
import { Card, Form, Input, Button, Space, Divider, Descriptions, message } from 'antd';
import type { TabLayout } from '@/types/workspace';
import { invokeFunction } from '@/services/api';

interface FormDetailRendererProps {
  layout: TabLayout;
}

export default function FormDetailRenderer({ layout }: FormDetailRendererProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  // 2.1 处理查询
  const handleQuery = async (values: any) => {
    setLoading(true);
    try {
      const result = await invokeFunction(layout.queryFunction!, values);
      setDetailData(result);
      message.success('查询成功');
    } catch (error: any) {
      message.error(error.message || '查询失败');
    } finally {
      setLoading(false);
    }
  };

  // 2.2 处理操作
  const handleAction = async (action: any) => {
    // TODO: 实现操作处理
  };

  return (
    <div>
      {/* 2.3 查询区 */}
      <Card title="查询条件" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={handleQuery}>
          {layout.queryFields?.map(field => (
            <Form.Item
              key={field.key}
              name={field.key}
              label={field.label}
              rules={[{ required: field.required, message: `请输入${field.label}` }]}
            >
              {renderField(field)}
            </Form.Item>
          ))}
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              查询
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 2.4 详情区 */}
      {detailData && (
        <>
          {layout.detailSections?.map((section, index) => (
            <Card key={index} title={section.title} style={{ marginBottom: 16 }}>
              <Descriptions column={2}>
                {section.fields.map(field => (
                  <Descriptions.Item key={field.key} label={field.label}>
                    {renderDetailField(field, detailData[field.key])}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          ))}

          {/* 2.5 操作区 */}
          {layout.actions && layout.actions.length > 0 && (
            <Card title="操作">
              <Space>
                {layout.actions.map(action => (
                  <Button
                    key={action.key}
                    type={action.key === 'primary' ? 'primary' : 'default'}
                    danger={action.danger}
                    icon={getIcon(action.icon)}
                    onClick={() => handleAction(action)}
                  >
                    {action.label}
                  </Button>
                ))}
              </Space>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// 3. 辅助函数
function renderField(field: any) {
  switch (field.type) {
    case 'input':
      return <Input placeholder={field.placeholder} />;
    case 'number':
      return <InputNumber placeholder={field.placeholder} />;
    // ... 其他类型
    default:
      return <Input />;
  }
}

function renderDetailField(field: any, value: any) {
  if (!value && value !== 0) return '-';

  switch (field.render) {
    case 'status':
      return <Badge status={value ? 'success' : 'default'} text={value ? '启用' : '禁用'} />;
    case 'datetime':
      return new Date(value).toLocaleString();
    // ... 其他渲染方式
    default:
      return value;
  }
}

function getIcon(iconName?: string) {
  if (!iconName) return null;
  const Icons = require('@ant-design/icons');
  const IconComponent = Icons[iconName];
  return IconComponent ? <IconComponent /> : null;
}
```

**验收标准**:

- [ ] 查询功能正常
- [ ] 详情显示正确
- [ ] 操作按钮可点击
- [ ] 错误处理完善

---

#### 任务 1.4.2: 实现 ListRenderer

**文件**: `src/components/WorkspaceRenderer/renderers/ListRenderer.tsx` **优先级**: P0 **预计时间**: 4 小时 **依赖**: 任务 1.3.3

**详细步骤**:

```typescript
// 1. 创建文件
touch src/components/WorkspaceRenderer/renderers/ListRenderer.tsx

// 2. 实现组件
import React, { useEffect, useState } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Space, message } from 'antd';
import type { TabLayout } from '@/types/workspace';
import { invokeFunction } from '@/services/api';

interface ListRendererProps {
  layout: TabLayout;
}

export default function ListRenderer({ layout }: ListRendererProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 2.1 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const result = await invokeFunction(layout.listFunction!, {});
      setData(Array.isArray(result) ? result : result.data || []);
    } catch (error: any) {
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [layout.listFunction]);

  // 2.2 生成列配置
  const columns: ProColumns<any>[] = layout.columns?.map(col => ({
    title: col.title,
    dataIndex: col.key,
    key: col.key,
    width: col.width,
    render: (text: any, record: any) => renderColumn(col, text, record),
  })) || [];

  // 2.3 添加行操作列
  if (layout.rowActions && layout.rowActions.length > 0) {
    columns.push({
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          {layout.rowActions?.map(action => (
            <Button
              key={action.key}
              type="link"
              size="small"
              onClick={() => handleRowAction(action, record)}
            >
              {action.label}
            </Button>
          ))}
        </Space>
      ),
    });
  }

  // 2.4 处理行操作
  const handleRowAction = (action: any, record: any) => {
    // TODO: 实现行操作
  };

  return (
    <ProTable
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey="id"
      search={false}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
      }}
      toolBarRender={() => [
        <Button key="refresh" onClick={loadData}>
          刷新
        </Button>,
      ]}
    />
  );
}

// 3. 辅助函数
function renderColumn(col: any, text: any, record: any) {
  if (!text && text !== 0) return '-';

  switch (col.render) {
    case 'status':
      return <Badge status={text ? 'success' : 'default'} text={text ? '启用' : '禁用'} />;
    case 'datetime':
      return new Date(text).toLocaleString();
    case 'money':
      return `¥${Number(text).toFixed(2)}`;
    case 'tag':
      return <Tag>{text}</Tag>;
    default:
      return text;
  }
}
```

**验收标准**:

- [ ] 列表数据加载正常
- [ ] 列渲染正确
- [ ] 行操作可点击
- [ ] 分页功能正常

---

#### 任务 1.4.3: 实现 FormRenderer

**文件**: `src/components/WorkspaceRenderer/renderers/FormRenderer.tsx` **优先级**: P1 **预计时间**: 3 小时 **依赖**: 任务 1.3.3

**详细步骤**:

```typescript
// 1. 创建文件
touch src/components/WorkspaceRenderer/renderers/FormRenderer.tsx

// 2. 实现组件
import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, Space, message } from 'antd';
import type { TabLayout } from '@/types/workspace';
import { invokeFunction } from '@/services/api';

interface FormRendererProps {
  layout: TabLayout;
}

export default function FormRenderer({ layout }: FormRendererProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 2.1 处理提交
  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await invokeFunction(layout.formFunction!, values);
      message.success('提交成功');
      form.resetFields();
    } catch (error: any) {
      message.error(error.message || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="horizontal"
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 14 }}
      onFinish={handleSubmit}
    >
      {layout.fields?.map(field => (
        <Form.Item
          key={field.key}
          name={field.key}
          label={field.label}
          rules={[{ required: field.required, message: `请输入${field.label}` }]}
        >
          {renderField(field)}
        </Form.Item>
      ))}

      <Form.Item wrapperCol={{ offset: 6, span: 14 }}>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            提交
          </Button>
          <Button onClick={() => form.resetFields()}>
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

// 3. 辅助函数
function renderField(field: any) {
  switch (field.type) {
    case 'input':
      return <Input placeholder={field.placeholder} />;
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
    case 'textarea':
      return <Input.TextArea rows={4} placeholder={field.placeholder} />;
    default:
      return <Input />;
  }
}
```

**验收标准**:

- [ ] 表单渲染正确
- [ ] 提交功能正常
- [ ] 验证规则生效
- [ ] 重置功能正常

---

#### 任务 1.4.4: 实现 DetailRenderer

**文件**: `src/components/WorkspaceRenderer/renderers/DetailRenderer.tsx` **优先级**: P1 **预计时间**: 2 小时 **依赖**: 任务 1.3.3

**详细步骤**:

```typescript
// 1. 创建文件
touch src/components/WorkspaceRenderer/renderers/DetailRenderer.tsx

// 2. 实现组件（类似 FormDetailRenderer 的详情部分）
import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Spin, message } from 'antd';
import type { TabLayout } from '@/types/workspace';
import { invokeFunction } from '@/services/api';

interface DetailRendererProps {
  layout: TabLayout;
}

export default function DetailRenderer({ layout }: DetailRendererProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [layout.detailFunction]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await invokeFunction(layout.detailFunction!, {});
      setData(result);
    } catch (error: any) {
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spin />;
  if (!data) return null;

  return (
    <>
      {layout.sections?.map((section, index) => (
        <Card key={index} title={section.title} style={{ marginBottom: 16 }}>
          <Descriptions column={2}>
            {section.fields.map(field => (
              <Descriptions.Item key={field.key} label={field.label}>
                {renderField(field, data[field.key])}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      ))}
    </>
  );
}

function renderField(field: any, value: any) {
  // 同 FormDetailRenderer 的 renderDetailField
}
```

**验收标准**:

- [ ] 详情加载正常
- [ ] 字段渲染正确
- [ ] 分区显示正确

---

### 1.5 改造现有 Workspace

#### 任务 1.5.1: 改造 Workspace Detail 页面

**文件**: `src/pages/Workspaces/Detail.tsx` **优先级**: P0 **预计时间**: 4 小时 **依赖**: 任务 1.3.1, 1.4.1, 1.4.2

**详细步骤**:

```typescript
// 1. 修改现有文件
// src/pages/Workspaces/Detail.tsx

import { WorkspaceRenderer } from '@/components/WorkspaceRenderer';
import { loadWorkspaceConfig } from '@/services/workspaceConfig';

export default function WorkspaceDetailPage() {
  const params = useParams<{ objectKey: string }>();
  const objectKey = decodeURIComponent(String(params?.objectKey || '')).toLowerCase();

  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // 1.1 加载配置
  useEffect(() => {
    loadConfig();
  }, [objectKey]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      // 1.2 尝试加载配置
      const workspaceConfig = await loadWorkspaceConfig(objectKey);

      if (workspaceConfig) {
        // 1.3 如果有配置，使用配置渲染
        setConfig(workspaceConfig);
      } else {
        // 1.4 如果没有配置，生成默认配置
        const defaultConfig = await generateDefaultConfig(objectKey);
        setConfig(defaultConfig);
      }
    } catch (error) {
      message.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spin />;
  if (!config) return <Empty />;

  // 1.5 使用 WorkspaceRenderer 渲染
  return <WorkspaceRenderer config={config} />;
}

// 2. 生成默认配置
async function generateDefaultConfig(objectKey: string): Promise<WorkspaceConfig> {
  // 2.1 加载函数描述符
  const descriptors = await listDescriptors();
  const functions = descriptors.filter((d) => d.entity === objectKey);

  // 2.2 生成默认配置
  return {
    objectKey,
    title: `${objectKey} 管理`,
    layout: {
      type: 'tabs',
      tabs: [
        {
          key: 'default',
          title: '默认',
          functions: functions.map((f) => f.id),
          layout: {
            type: 'list',
            listFunction: functions.find((f) => f.operation?.includes('list'))?.id,
            columns: [{ key: 'id', title: 'ID', width: 80 }],
          },
        },
      ],
    },
  };
}
```

**验收标准**:

- [ ] 可以加载配置
- [ ] 可以使用 WorkspaceRenderer 渲染
- [ ] 没有配置时显示默认界面
- [ ] 兼容现有功能

---

## 🎯 Phase 2: 可视化编排工具（Week 2 后半）

### 2.1 编排器基础框架

#### 任务 2.1.1: 创建 WorkspaceEditor 页面

**文件**: `src/pages/WorkspaceEditor/index.tsx` **优先级**: P0 **预计时间**: 4 小时 **依赖**: 任务 1.2.1

**详细步骤**:

```typescript
// 1. 创建目录和文件
mkdir -p src/pages/WorkspaceEditor
touch src/pages/WorkspaceEditor/index.tsx

// 2. 实现基础框架
import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Row, Col, Button, message } from 'antd';
import { useParams } from '@umijs/max';
import FunctionList from './components/FunctionList';
import LayoutDesigner from './components/LayoutDesigner';
import ConfigPreview from './components/ConfigPreview';
import { loadWorkspaceConfig, saveWorkspaceConfig } from '@/services/workspaceConfig';
import { listDescriptors } from '@/services/api';
import type { WorkspaceConfig } from '@/types/workspace';

export default function WorkspaceEditor() {
  const params = useParams<{ objectKey: string }>();
  const objectKey = params.objectKey || '';

  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [availableFunctions, setAvailableFunctions] = useState([]);
  const [loading, setLoading] = useState(false);

  // 2.1 加载数据
  useEffect(() => {
    loadData();
  }, [objectKey]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载配置
      const workspaceConfig = await loadWorkspaceConfig(objectKey);
      if (workspaceConfig) {
        setConfig(workspaceConfig);
      } else {
        // 创建新配置
        setConfig({
          objectKey,
          title: `${objectKey} 管理`,
          layout: { type: 'tabs', tabs: [] },
        });
      }

      // 加载可用函数
      const descriptors = await listDescriptors();
      const functions = descriptors.filter(d => d.entity === objectKey);
      setAvailableFunctions(functions);
    } catch (error) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 2.2 保存配置
  const handleSave = async () => {
    if (!config) return;

    try {
      await saveWorkspaceConfig(config);
      message.success('保存成功');
    } catch (error) {
      message.error('保存失败');
    }
  };

  return (
    <PageContainer
      title={`编排 Workspace: ${objectKey}`}
      extra={[
        <Button key="save" type="primary" onClick={handleSave}>
          保存配置
        </Button>,
      ]}
    >
      <Row gutter={16}>
        {/* 左侧：可用函数列表 */}
        <Col span={6}>
          <FunctionList functions={availableFunctions} />
        </Col>

        {/* 中间：布局设计器 */}
        <Col span={12}>
          <LayoutDesigner
            config={config}
            onChange={setConfig}
          />
        </Col>

        {/* 右侧：实时预览 */}
        <Col span={6}>
          <ConfigPreview config={config} />
        </Col>
      </Row>
    </PageContainer>
  );
}
```

**验收标准**:

- [ ] 页面布局正确
- [ ] 可以加载配置
- [ ] 可以保存配置
- [ ] 三栏布局显示正常

---

#### 任务 2.1.2: 实现 FunctionList 组件

**文件**: `src/pages/WorkspaceEditor/components/FunctionList.tsx` **优先级**: P0 **预计时间**: 3 小时 **依赖**: 任务 2.1.1

**详细步骤**:

```typescript
// 1. 创建文件
mkdir -p src/pages/WorkspaceEditor/components
touch src/pages/WorkspaceEditor/components/FunctionList.tsx

// 2. 实现组件
import React from 'react';
import { Card, List, Tag, Typography } from 'antd';
import type { FunctionDescriptor } from '@/services/api';

interface FunctionListProps {
  functions: FunctionDescriptor[];
}

export default function FunctionList({ functions }: FunctionListProps) {
  return (
    <Card title="可用函数" style={{ height: '100%' }}>
      <List
        dataSource={functions}
        renderItem={func => (
          <List.Item
            draggable
            onDragStart={(e) => handleDragStart(e, func)}
            style={{ cursor: 'move' }}
          >
            <List.Item.Meta
              title={func.display_name?.zh || func.id}
              description={
                <>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {func.id}
                  </Typography.Text>
                  <br />
                  <Tag color="blue">{func.operation}</Tag>
                </>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}

// 3. 拖拽处理
function handleDragStart(e: React.DragEvent, func: FunctionDescriptor) {
  e.dataTransfer.setData('function', JSON.stringify(func));
}
```

**验收标准**:

- [ ] 函数列表显示正确
- [ ] 可以拖拽函数
- [ ] 显示函数信息

---

## 📊 Week 2 任务清单

### 前半周（Day 1-3）

- [ ] 1.4.1 实现 FormDetailRenderer
- [ ] 1.4.2 实现 ListRenderer
- [ ] 1.4.3 实现 FormRenderer
- [ ] 1.4.4 实现 DetailRenderer
- [ ] 1.5.1 改造 Workspace Detail 页面

### 后半周（Day 4-5）

- [ ] 2.1.1 创建 WorkspaceEditor 页面
- [ ] 2.1.2 实现 FunctionList 组件

---

## 📝 注意事项

1. **测试每个渲染器** - 完成后立即测试
2. **保持代码整洁** - 提取公共逻辑
3. **错误处理** - 所有 API 调用都要有错误处理
4. **用户体验** - 加载状态、错误提示要完善

---

## 🔗 相关文档

- [Week 1 TODO](./TODO_WEEK1.md)
- [架构设计文档](./ARCHITECTURE_DESIGN.md)
