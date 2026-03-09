import React from 'react';
import { Space, Form, Select, Button, Table, Popconfirm, message, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { TabConfig, ColumnConfig, FieldConfig } from '@/types/workspace';
import type { FunctionDescriptor } from '@/services/api/functions';
import {
  schemaToColumns,
  schemaToDetailSections,
  schemaToFields,
} from '../../utils/schemaToLayout';

export interface LayoutConfigRendererProps {
  layout: any;
  tab: TabConfig;
  descriptors: FunctionDescriptor[];
  onTabChange: (tab: TabConfig) => void;
  onOpenColumnEditor: (column: ColumnConfig | null) => void;
  onOpenFieldEditor: (field: FieldConfig | null) => void;
}

export default function LayoutConfigRenderer({
  layout,
  tab,
  descriptors,
  onTabChange,
  onOpenColumnEditor,
  onOpenFieldEditor,
}: LayoutConfigRendererProps) {
  switch (layout.type) {
    case 'list':
      return (
        <ListLayoutConfig
          layout={layout}
          tab={tab}
          descriptors={descriptors}
          onTabChange={onTabChange}
          onOpenColumnEditor={onOpenColumnEditor}
        />
      );
    case 'form-detail':
      return (
        <FormDetailLayoutConfig
          layout={layout}
          tab={tab}
          descriptors={descriptors}
          onTabChange={onTabChange}
          onOpenFieldEditor={onOpenFieldEditor}
        />
      );
    case 'form':
      return (
        <FormLayoutConfig
          layout={layout}
          tab={tab}
          descriptors={descriptors}
          onTabChange={onTabChange}
          onOpenFieldEditor={onOpenFieldEditor}
        />
      );
    case 'detail':
      return (
        <DetailLayoutConfig
          layout={layout}
          tab={tab}
          descriptors={descriptors}
          onTabChange={onTabChange}
        />
      );
    case 'kanban':
    case 'timeline':
    case 'split':
    case 'wizard':
    case 'dashboard':
    case 'grid':
    case 'custom':
      return <SimpleJsonConfig layout={layout} tab={tab} onTabChange={onTabChange} />;
    default:
      return <div style={{ color: '#999' }}>请选择布局类型</div>;
  }
}

// List Layout Config
function ListLayoutConfig({
  layout,
  tab,
  descriptors,
  onTabChange,
  onOpenColumnEditor,
}: {
  layout: any;
  tab: TabConfig;
  descriptors: FunctionDescriptor[];
  onTabChange: (tab: TabConfig) => void;
  onOpenColumnEditor: (column: ColumnConfig | null) => void;
}) {
  const columns: ColumnConfig[] = layout.columns || [];

  const autoFill = () => {
    const funcId = layout.listFunction || tab.functions[0];
    const desc = descriptors.find((d) => d.id === funcId);
    if (!desc) {
      message.warning('未找到函数描述符');
      return;
    }
    const cols = schemaToColumns(desc);
    onTabChange({ ...tab, layout: { ...layout, columns: cols } });
    message.success(`已自动生成 ${cols.length} 列`);
  };

  const removeCol = (key: string) => {
    onTabChange({ ...tab, layout: { ...layout, columns: columns.filter((c) => c.key !== key) } });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form layout="vertical">
        <Form.Item label="列表函数">
          <Select
            value={layout.listFunction}
            onChange={(v) => {
              const nextLayout: any = { ...layout, listFunction: v };
              const missingColumns =
                !Array.isArray(nextLayout.columns) || nextLayout.columns.length === 0;
              if (v && missingColumns) {
                const desc = descriptors.find((d) => d.id === v);
                if (desc) {
                  nextLayout.columns = schemaToColumns(desc);
                }
              }
              onTabChange({ ...tab, layout: nextLayout });
            }}
            placeholder="选择列表函数"
            allowClear
            showSearch
          >
            {tab.functions.map((fid) => {
              const d = descriptors.find((x) => x.id === fid);
              return (
                <Select.Option key={fid} value={fid}>
                  {d?.display_name?.zh || fid}
                </Select.Option>
              );
            })}
          </Select>
        </Form.Item>
      </Form>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 500 }}>列配置 ({columns.length})</span>
        <Space>
          <Button size="small" icon={<ThunderboltOutlined />} onClick={autoFill}>
            自动填充
          </Button>
          <Button size="small" icon={<PlusOutlined />} onClick={() => onOpenColumnEditor(null)}>
            添加列
          </Button>
        </Space>
      </div>
      <Table
        size="small"
        dataSource={columns}
        rowKey="key"
        pagination={false}
        columns={[
          { title: '字段名', dataIndex: 'key', width: 100 },
          { title: '标题', dataIndex: 'title', width: 100 },
          { title: '渲染', dataIndex: 'render', width: 80, render: (v) => v || 'text' },
          {
            title: '操作',
            width: 80,
            render: (_, col) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onOpenColumnEditor(col)}
                />
                <Popconfirm title="确认删除？" onConfirm={() => removeCol(col.key)}>
                  <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        locale={{ emptyText: '暂无列，点击添加或自动填充' }}
      />
    </Space>
  );
}

// Form-Detail Layout Config
function FormDetailLayoutConfig({
  layout,
  tab,
  descriptors,
  onTabChange,
  onOpenFieldEditor,
}: {
  layout: any;
  tab: TabConfig;
  descriptors: FunctionDescriptor[];
  onTabChange: (tab: TabConfig) => void;
  onOpenFieldEditor: (field: FieldConfig | null) => void;
}) {
  const queryFields: FieldConfig[] = layout.queryFields || [];

  const autoFill = () => {
    const funcId = layout.queryFunction || tab.functions[0];
    const desc = descriptors.find((d) => d.id === funcId);
    if (!desc) {
      message.warning('未找到函数描述符');
      return;
    }
    const fields = schemaToFields(desc);
    onTabChange({ ...tab, layout: { ...layout, queryFields: fields } });
    message.success(`已自动生成 ${fields.length} 个查询字段`);
  };

  const removeField = (key: string) => {
    onTabChange({
      ...tab,
      layout: { ...layout, queryFields: queryFields.filter((f) => f.key !== key) },
    });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form layout="vertical">
        <Form.Item label="查询函数">
          <Select
            value={layout.queryFunction}
            onChange={(v) => onTabChange({ ...tab, layout: { ...layout, queryFunction: v } })}
            placeholder="选择查询函数"
            allowClear
            showSearch
          >
            {tab.functions.map((fid) => {
              const d = descriptors.find((x) => x.id === fid);
              return (
                <Select.Option key={fid} value={fid}>
                  {d?.display_name?.zh || fid}
                </Select.Option>
              );
            })}
          </Select>
        </Form.Item>
      </Form>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 500 }}>查询字段 ({queryFields.length})</span>
        <Space>
          <Button size="small" icon={<ThunderboltOutlined />} onClick={autoFill}>
            自动填充
          </Button>
          <Button size="small" icon={<PlusOutlined />} onClick={() => onOpenFieldEditor(null)}>
            添加字段
          </Button>
        </Space>
      </div>
      <Table
        size="small"
        dataSource={queryFields}
        rowKey="key"
        pagination={false}
        columns={[
          { title: '字段名', dataIndex: 'key', width: 100 },
          { title: '标签', dataIndex: 'label', width: 100 },
          { title: '类型', dataIndex: 'type', width: 80 },
          {
            title: '操作',
            width: 80,
            render: (_, field) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onOpenFieldEditor(field)}
                />
                <Popconfirm title="确认删除？" onConfirm={() => removeField(field.key)}>
                  <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        locale={{ emptyText: '暂无字段，点击添加或自动填充' }}
      />
    </Space>
  );
}

// Form Layout Config
function FormLayoutConfig({
  layout,
  tab,
  descriptors,
  onTabChange,
  onOpenFieldEditor,
}: {
  layout: any;
  tab: TabConfig;
  descriptors: FunctionDescriptor[];
  onTabChange: (tab: TabConfig) => void;
  onOpenFieldEditor: (field: FieldConfig | null) => void;
}) {
  const fields: FieldConfig[] = layout.fields || [];

  const autoFill = () => {
    const funcId = layout.submitFunction || tab.functions[0];
    const desc = descriptors.find((d) => d.id === funcId);
    if (!desc) {
      message.warning('未找到函数描述符');
      return;
    }
    const generatedFields = schemaToFields(desc);
    onTabChange({ ...tab, layout: { ...layout, fields: generatedFields } });
    message.success(`已自动生成 ${generatedFields.length} 个字段`);
  };

  const removeField = (key: string) => {
    onTabChange({
      ...tab,
      layout: { ...layout, fields: fields.filter((f) => f.key !== key) },
    });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form layout="vertical">
        <Form.Item label="提交函数">
          <Select
            value={layout.submitFunction}
            onChange={(v) => onTabChange({ ...tab, layout: { ...layout, submitFunction: v } })}
            placeholder="选择提交函数"
            allowClear
            showSearch
          >
            {tab.functions.map((fid) => {
              const d = descriptors.find((x) => x.id === fid);
              return (
                <Select.Option key={fid} value={fid}>
                  {d?.display_name?.zh || fid}
                </Select.Option>
              );
            })}
          </Select>
        </Form.Item>
      </Form>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 500 }}>表单字段 ({fields.length})</span>
        <Space>
          <Button size="small" icon={<ThunderboltOutlined />} onClick={autoFill}>
            自动填充
          </Button>
          <Button size="small" icon={<PlusOutlined />} onClick={() => onOpenFieldEditor(null)}>
            添加字段
          </Button>
        </Space>
      </div>
      <Table
        size="small"
        dataSource={fields}
        rowKey="key"
        pagination={false}
        columns={[
          { title: '字段名', dataIndex: 'key', width: 100 },
          { title: '标签', dataIndex: 'label', width: 100 },
          { title: '类型', dataIndex: 'type', width: 80 },
          {
            title: '操作',
            width: 80,
            render: (_, field) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onOpenFieldEditor(field)}
                />
                <Popconfirm title="确认删除？" onConfirm={() => removeField(field.key)}>
                  <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        locale={{ emptyText: '暂无字段，点击添加或自动填充' }}
      />
    </Space>
  );
}

// Detail Layout Config
function DetailLayoutConfig({
  layout,
  tab,
  descriptors,
  onTabChange,
}: {
  layout: any;
  tab: TabConfig;
  descriptors: FunctionDescriptor[];
  onTabChange: (tab: TabConfig) => void;
}) {
  return (
    <Form layout="vertical">
      <Form.Item label="详情函数">
        <Select
          value={layout.detailFunction}
          onChange={(v) => onTabChange({ ...tab, layout: { ...layout, detailFunction: v } })}
          placeholder="选择详情函数"
          allowClear
          showSearch
        >
          {tab.functions.map((fid) => {
            const d = descriptors.find((x) => x.id === fid);
            return (
              <Select.Option key={fid} value={fid}>
                {d?.display_name?.zh || fid}
              </Select.Option>
            );
          })}
        </Select>
      </Form.Item>
      <Form.Item label="分区配置(JSON)">
        <Input.TextArea
          rows={10}
          value={JSON.stringify(layout.sections || [], null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              if (Array.isArray(parsed)) {
                onTabChange({ ...tab, layout: { ...layout, sections: parsed } });
              }
            } catch {
              // ignore invalid json while editing
            }
          }}
        />
      </Form.Item>
    </Form>
  );
}

// Simple JSON Config for complex layouts
function SimpleJsonConfig({
  layout,
  tab,
  onTabChange,
}: {
  layout: any;
  tab: TabConfig;
  onTabChange: (tab: TabConfig) => void;
}) {
  return (
    <Form layout="vertical">
      <Form.Item label="布局配置(JSON)">
        <Input.TextArea
          rows={15}
          value={JSON.stringify(layout, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onTabChange({ ...tab, layout: parsed });
            } catch {
              // ignore invalid json while editing
            }
          }}
        />
      </Form.Item>
    </Form>
  );
}
