# Workspace 重构 TODO - Week 3

**阶段**: Phase 2 完成 - 可视化编排工具 **目标**: 完成可视化编排工具的核心功能

---

## 🎯 Phase 2 继续: 可视化编排工具

### 2.2 布局设计器

#### 任务 2.2.1: 实现 LayoutDesigner 组件

**文件**: `src/pages/WorkspaceEditor/components/LayoutDesigner.tsx` **优先级**: P0 **预计时间**: 6 小时 **依赖**: 任务 2.1.1

**详细步骤**:

```typescript
// 1. 创建文件
touch src/pages/WorkspaceEditor/components/LayoutDesigner.tsx

// 2. 实现组件
import React from 'react';
import { Card, Tabs, Button, Space, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { WorkspaceConfig } from '@/types/workspace';
import TabEditor from './TabEditor';

interface LayoutDesignerProps {
  config: WorkspaceConfig | null;
  onChange: (config: WorkspaceConfig) => void;
}

export default function LayoutDesigner({ config, onChange }: LayoutDesignerProps) {
  if (!config) return <Empty description="请先选择对象" />;

  // 2.1 添加 Tab
  const handleAddTab = () => {
    const newTab = {
      key: `tab_${Date.now()}`,
      title: '新标签页',
      functions: [],
      layout: {
        type: 'list' as const,
      },
    };

    onChange({
      ...config,
      layout: {
        ...config.layout,
        tabs: [...(config.layout.tabs || []), newTab],
      },
    });
  };

  // 2.2 删除 Tab
  const handleDeleteTab = (tabKey: string) => {
    onChange({
      ...config,
      layout: {
        ...config.layout,
        tabs: config.layout.tabs?.filter(t => t.key !== tabKey),
      },
    });
  };

  // 2.3 更新 Tab
  const handleUpdateTab = (tabKey: string, updatedTab: any) => {
    onChange({
      ...config,
      layout: {
        ...config.layout,
        tabs: config.layout.tabs?.map(t =>
          t.key === tabKey ? updatedTab : t
        ),
      },
    });
  };

  return (
    <Card
      title="布局设计"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddTab}
        >
          添加 Tab
        </Button>
      }
    >
      {config.layout.tabs && config.layout.tabs.length > 0 ? (
        <Tabs
          type="editable-card"
          onEdit={(targetKey, action) => {
            if (action === 'remove') {
              handleDeleteTab(targetKey as string);
            }
          }}
        >
          {config.layout.tabs.map(tab => (
            <Tabs.TabPane
              key={tab.key}
              tab={tab.title}
              closable
            >
              <TabEditor
                tab={tab}
                onChange={(updatedTab) => handleUpdateTab(tab.key, updatedTab)}
              />
            </Tabs.TabPane>
          ))}
        </Tabs>
      ) : (
        <Empty description="暂无标签页，点击上方按钮添加" />
      )}
    </Card>
  );
}
```

**验收标准**:

- [ ] 可以添加 Tab
- [ ] 可以删除 Tab
- [ ] 可以编辑 Tab
- [ ] Tab 切换正常

---

#### 任务 2.2.2: 实现 TabEditor 组件

**文件**: `src/pages/WorkspaceEditor/components/TabEditor.tsx` **优先级**: P0 **预计时间**: 8 小时 **依赖**: 任务 2.2.1

**详细步骤**:

```typescript
// 1. 创建文件
touch src/pages/WorkspaceEditor/components/TabEditor.tsx

// 2. 实现组件
import React from 'react';
import { Form, Input, Select, Card, Space, Button, List, Tag } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { TabConfig } from '@/types/workspace';

interface TabEditorProps {
  tab: TabConfig;
  onChange: (tab: TabConfig) => void;
}

export default function TabEditor({ tab, onChange }: TabEditorProps) {
  // 2.1 更新基本信息
  const handleBasicChange = (field: string, value: any) => {
    onChange({
      ...tab,
      [field]: value,
    });
  };

  // 2.2 更新布局类型
  const handleLayoutTypeChange = (type: string) => {
    onChange({
      ...tab,
      layout: {
        type: type as any,
      },
    });
  };

  // 2.3 添加函数
  const handleAddFunction = (functionId: string) => {
    if (!tab.functions.includes(functionId)) {
      onChange({
        ...tab,
        functions: [...tab.functions, functionId],
      });
    }
  };

  // 2.4 删除函数
  const handleRemoveFunction = (functionId: string) => {
    onChange({
      ...tab,
      functions: tab.functions.filter(f => f !== functionId),
    });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* 2.5 基本信息 */}
      <Card title="基本信息" size="small">
        <Form layout="vertical">
          <Form.Item label="标题">
            <Input
              value={tab.title}
              onChange={(e) => handleBasicChange('title', e.target.value)}
              placeholder="请输入标题"
            />
          </Form.Item>

          <Form.Item label="图标">
            <Input
              value={tab.icon}
              onChange={(e) => handleBasicChange('icon', e.target.value)}
              placeholder="如: UserOutlined"
            />
          </Form.Item>
        </Form>
      </Card>

      {/* 2.6 布局类型 */}
      <Card title="布局类型" size="small">
        <Select
          value={tab.layout.type}
          onChange={handleLayoutTypeChange}
          style={{ width: '100%' }}
        >
          <Select.Option value="form-detail">表单-详情</Select.Option>
          <Select.Option value="list">列表</Select.Option>
          <Select.Option value="form">表单</Select.Option>
          <Select.Option value="detail">详情</Select.Option>
        </Select>
      </Card>

      {/* 2.7 使用的函数 */}
      <Card
        title="使用的函数"
        size="small"
        extra={
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onDrop={(e) => {
              e.preventDefault();
              const funcData = e.dataTransfer.getData('function');
              if (funcData) {
                const func = JSON.parse(funcData);
                handleAddFunction(func.id);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            拖拽函数到这里
          </Button>
        }
      >
        <List
          dataSource={tab.functions}
          renderItem={funcId => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveFunction(funcId)}
                />,
              ]}
            >
              <Tag color="blue">{funcId}</Tag>
            </List.Item>
          )}
        />
      </Card>

      {/* 2.8 布局详细配置 */}
      <Card title="布局配置" size="small">
        {renderLayoutConfig(tab.layout, (layout) => {
          onChange({ ...tab, layout });
        })}
      </Card>
    </Space>
  );
}

// 3. 渲染布局配置
function renderLayoutConfig(layout: any, onChange: (layout: any) => void) {
  switch (layout.type) {
    case 'form-detail':
      return <FormDetailLayoutConfig layout={layout} onChange={onChange} />;
    case 'list':
      return <ListLayoutConfig layout={layout} onChange={onChange} />;
    case 'form':
      return <FormLayoutConfig layout={layout} onChange={onChange} />;
    case 'detail':
      return <DetailLayoutConfig layout={layout} onChange={onChange} />;
    default:
      return <div>请选择布局类型</div>;
  }
}
```

**验收标准**:

- [ ] 可以编辑 Tab 基本信息
- [ ] 可以选择布局类型
- [ ] 可以拖拽添加函数
- [ ] 可以删除函数
- [ ] 可以配置布局详情

---

#### 任务 2.2.3: 实现布局配置组件

**文件**: `src/pages/WorkspaceEditor/components/LayoutConfigs/` **优先级**: P0 **预计时间**: 10 小时 **依赖**: 任务 2.2.2

**详细步骤**:

```typescript
// 1. 创建目录和文件
mkdir -p src/pages/WorkspaceEditor/components/LayoutConfigs
touch src/pages/WorkspaceEditor/components/LayoutConfigs/FormDetailLayoutConfig.tsx
touch src/pages/WorkspaceEditor/components/LayoutConfigs/ListLayoutConfig.tsx
touch src/pages/WorkspaceEditor/components/LayoutConfigs/FormLayoutConfig.tsx
touch src/pages/WorkspaceEditor/components/LayoutConfigs/DetailLayoutConfig.tsx

// 2. 实现 ListLayoutConfig
// src/pages/WorkspaceEditor/components/LayoutConfigs/ListLayoutConfig.tsx
import React from 'react';
import { Form, Select, Button, Table, Input, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

interface ListLayoutConfigProps {
  layout: any;
  onChange: (layout: any) => void;
}

export default function ListLayoutConfig({ layout, onChange }: ListLayoutConfigProps) {
  // 2.1 选择列表函数
  const handleListFunctionChange = (functionId: string) => {
    onChange({
      ...layout,
      listFunction: functionId,
    });
  };

  // 2.2 添加列
  const handleAddColumn = () => {
    const newColumn = {
      key: `col_${Date.now()}`,
      title: '新列',
      width: 150,
      render: 'text',
    };

    onChange({
      ...layout,
      columns: [...(layout.columns || []), newColumn],
    });
  };

  // 2.3 删除列
  const handleDeleteColumn = (index: number) => {
    onChange({
      ...layout,
      columns: layout.columns?.filter((_: any, i: number) => i !== index),
    });
  };

  // 2.4 更新列
  const handleUpdateColumn = (index: number, field: string, value: any) => {
    const newColumns = [...(layout.columns || [])];
    newColumns[index] = {
      ...newColumns[index],
      [field]: value,
    };

    onChange({
      ...layout,
      columns: newColumns,
    });
  };

  return (
    <div>
      {/* 2.5 选择列表函数 */}
      <Form.Item label="列表函数">
        <Select
          value={layout.listFunction}
          onChange={handleListFunctionChange}
          placeholder="请选择列表函数"
        >
          {/* TODO: 从 tab.functions 中筛选 list 类型的函数 */}
        </Select>
      </Form.Item>

      {/* 2.6 列配置 */}
      <Form.Item label="列配置">
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddColumn}
          block
          style={{ marginBottom: 8 }}
        >
          添加列
        </Button>

        <Table
          dataSource={layout.columns || []}
          pagination={false}
          size="small"
          columns={[
            {
              title: '字段名',
              dataIndex: 'key',
              render: (text, record, index) => (
                <Input
                  value={text}
                  onChange={(e) => handleUpdateColumn(index, 'key', e.target.value)}
                  placeholder="字段名"
                />
              ),
            },
            {
              title: '标题',
              dataIndex: 'title',
              render: (text, record, index) => (
                <Input
                  value={text}
                  onChange={(e) => handleUpdateColumn(index, 'title', e.target.value)}
                  placeholder="标题"
                />
              ),
            },
            {
              title: '宽度',
              dataIndex: 'width',
              width: 100,
              render: (text, record, index) => (
                <InputNumber
                  value={text}
                  onChange={(value) => handleUpdateColumn(index, 'width', value)}
                  placeholder="宽度"
                />
              ),
            },
            {
              title: '渲染方式',
              dataIndex: 'render',
              width: 120,
              render: (text, record, index) => (
                <Select
                  value={text}
                  onChange={(value) => handleUpdateColumn(index, 'render', value)}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="text">文本</Select.Option>
                  <Select.Option value="status">状态</Select.Option>
                  <Select.Option value="datetime">日期时间</Select.Option>
                  <Select.Option value="tag">标签</Select.Option>
                  <Select.Option value="money">金额</Select.Option>
                </Select>
              ),
            },
            {
              title: '操作',
              width: 60,
              render: (_, record, index) => (
                <Button
                  type="link"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteColumn(index)}
                />
              ),
            },
          ]}
        />
      </Form.Item>
    </div>
  );
}

// 3. 类似地实现其他配置组件
// FormDetailLayoutConfig.tsx
// FormLayoutConfig.tsx
// DetailLayoutConfig.tsx
```

**验收标准**:

- [ ] 可以配置列表函数
- [ ] 可以添加/删除/编辑列
- [ ] 可以配置列的渲染方式
- [ ] 其他布局配置组件实现完整

---

### 2.3 实时预览

#### 任务 2.3.1: 实现 ConfigPreview 组件

**文件**: `src/pages/WorkspaceEditor/components/ConfigPreview.tsx` **优先级**: P1 **预计时间**: 4 小时 **依赖**: 任务 2.1.1

**详细步骤**:

```typescript
// 1. 创建文件
touch src/pages/WorkspaceEditor/components/ConfigPreview.tsx

// 2. 实现组件
import React, { useState } from 'react';
import { Card, Tabs, Button } from 'antd';
import { EyeOutlined, CodeOutlined } from '@ant-design/icons';
import { WorkspaceRenderer } from '@/components/WorkspaceRenderer';
import type { WorkspaceConfig } from '@/types/workspace';
import MonacoEditor from '@monaco-editor/react';

interface ConfigPreviewProps {
  config: WorkspaceConfig | null;
}

export default function ConfigPreview({ config }: ConfigPreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');

  if (!config) {
    return (
      <Card title="预览">
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          暂无配置
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="预览"
      extra={
        <Tabs
          activeKey={viewMode}
          onChange={(key) => setViewMode(key as any)}
          size="small"
          items={[
            {
              key: 'preview',
              label: (
                <>
                  <EyeOutlined /> 预览
                </>
              ),
            },
            {
              key: 'code',
              label: (
                <>
                  <CodeOutlined /> 代码
                </>
              ),
            },
          ]}
        />
      }
    >
      {viewMode === 'preview' ? (
        <div style={{ border: '1px solid #f0f0f0', padding: 16, minHeight: 400 }}>
          <WorkspaceRenderer config={config} />
        </div>
      ) : (
        <MonacoEditor
          height="400px"
          language="json"
          value={JSON.stringify(config, null, 2)}
          options={{
            readOnly: true,
            minimap: { enabled: false },
          }}
        />
      )}
    </Card>
  );
}
```

**验收标准**:

- [ ] 可以实时预览配置效果
- [ ] 可以查看配置代码
- [ ] 预览和代码可以切换

---

### 2.4 配置模板

#### 任务 2.4.1: 实现配置模板功能

**文件**: `src/pages/WorkspaceEditor/templates/index.ts` **优先级**: P2 **预计时间**: 4 小时 **依赖**: 任务 2.1.1

**详细步骤**:

```typescript
// 1. 创建文件
mkdir -p src/pages/WorkspaceEditor/templates
touch src/pages/WorkspaceEditor/templates/index.ts

// 2. 定义模板
import type { WorkspaceConfig } from '@/types/workspace';

export interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  preview?: string;
  config: Partial<WorkspaceConfig>;
}

export const configTemplates: ConfigTemplate[] = [
  // 2.1 基础列表模板
  {
    id: 'basic-list',
    name: '基础列表',
    description: '简单的列表页面，适合展示数据',
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'list',
            title: '列表',
            functions: [],
            layout: {
              type: 'list',
              columns: [
                { key: 'id', title: 'ID', width: 80 },
                { key: 'name', title: '名称', width: 150 },
                { key: 'status', title: '状态', width: 100, render: 'status' },
                { key: 'createdAt', title: '创建时间', width: 180, render: 'datetime' },
              ],
            },
          },
        ],
      },
    },
  },

  // 2.2 表单-详情模板
  {
    id: 'form-detail',
    name: '表单-详情',
    description: '先查询，再显示详情和操作，适合管理单个对象',
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'info',
            title: '信息',
            functions: [],
            layout: {
              type: 'form-detail',
              queryFields: [
                { key: 'id', label: 'ID', type: 'input', required: true },
              ],
              detailSections: [
                {
                  title: '基本信息',
                  fields: [
                    { key: 'id', label: 'ID' },
                    { key: 'name', label: '名称' },
                    { key: 'status', label: '状态', render: 'status' },
                  ],
                },
              ],
              actions: [],
            },
          },
        ],
      },
    },
  },

  // 2.3 完整管理模板
  {
    id: 'full-management',
    name: '完整管理',
    description: '包含列表、详情、操作的完整管理界面',
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'list',
            title: '列表',
            functions: [],
            layout: {
              type: 'list',
              columns: [
                { key: 'id', title: 'ID', width: 80 },
                { key: 'name', title: '名称', width: 150 },
              ],
            },
          },
          {
            key: 'detail',
            title: '详情',
            functions: [],
            layout: {
              type: 'form-detail',
              queryFields: [
                { key: 'id', label: 'ID', type: 'input', required: true },
              ],
              detailSections: [
                {
                  title: '基本信息',
                  fields: [
                    { key: 'id', label: 'ID' },
                    { key: 'name', label: '名称' },
                  ],
                },
              ],
              actions: [],
            },
          },
        ],
      },
    },
  },
];

// 3. 应用模板函数
export function applyTemplate(
  template: ConfigTemplate,
  objectKey: string,
  title: string
): WorkspaceConfig {
  return {
    objectKey,
    title,
    ...template.config,
  } as WorkspaceConfig;
}
```

**验收标准**:

- [ ] 定义了至少 3 个模板
- [ ] 可以应用模板
- [ ] 模板配置正确

---

#### 任务 2.4.2: 在编排器中集成模板

**文件**: `src/pages/WorkspaceEditor/index.tsx` **优先级**: P2 **预计时间**: 2 小时 **依赖**: 任务 2.4.1

**详细步骤**:

```typescript
// 1. 修改 WorkspaceEditor
// 添加模板选择功能

import { configTemplates, applyTemplate } from './templates';

// 2. 添加模板选择按钮
<Button
  onClick={() => setShowTemplateModal(true)}
>
  使用模板
</Button>

// 3. 实现模板选择 Modal
<Modal
  title="选择模板"
  open={showTemplateModal}
  onCancel={() => setShowTemplateModal(false)}
  footer={null}
>
  <List
    dataSource={configTemplates}
    renderItem={template => (
      <List.Item
        actions={[
          <Button
            type="primary"
            onClick={() => {
              const newConfig = applyTemplate(
                template,
                objectKey,
                config?.title || ''
              );
              setConfig(newConfig);
              setShowTemplateModal(false);
            }}
          >
            使用
          </Button>,
        ]}
      >
        <List.Item.Meta
          title={template.name}
          description={template.description}
        />
      </List.Item>
    )}
  />
</Modal>
```

**验收标准**:

- [ ] 可以打开模板选择
- [ ] 可以应用模板
- [ ] 应用后配置正确

---

## 📊 Week 3 任务清单

### Day 1-2

- [ ] 2.2.1 实现 LayoutDesigner 组件
- [ ] 2.2.2 实现 TabEditor 组件

### Day 3-4

- [ ] 2.2.3 实现布局配置组件
  - [ ] ListLayoutConfig
  - [ ] FormDetailLayoutConfig
  - [ ] FormLayoutConfig
  - [ ] DetailLayoutConfig

### Day 5

- [ ] 2.3.1 实现 ConfigPreview 组件
- [ ] 2.4.1 实现配置模板功能
- [ ] 2.4.2 在编排器中集成模板

---

## 📝 注意事项

1. **用户体验** - 拖拽要流畅，反馈要及时
2. **实时预览** - 配置修改后立即更新预览
3. **错误处理** - 配置错误要有明确提示
4. **性能优化** - 大量配置时不能卡顿

---

## 🔗 相关文档

- [Week 1 TODO](./TODO_WEEK1.md)
- [Week 2 TODO](./TODO_WEEK2.md)
- [架构设计文档](./ARCHITECTURE_DESIGN.md)
