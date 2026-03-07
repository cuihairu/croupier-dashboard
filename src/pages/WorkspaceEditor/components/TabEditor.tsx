import React, { useState } from 'react';
import {
  Form,
  Input,
  Select,
  Card,
  Space,
  List,
  Tag,
  Button,
  message,
  Table,
  Popconfirm,
  Modal,
  Switch,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  EditOutlined,
  ThunderboltOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { TabConfig, ColumnConfig, FieldConfig } from '@/types/workspace';
import type { FunctionDescriptor } from '@/services/api/functions';
import { CodeEditor } from '@/components/MonacoDynamic';
import IconPicker from './IconPicker';
import {
  descriptorToLayout,
  schemaToColumns,
  schemaToDetailSections,
  schemaToFields,
} from '../utils/schemaToLayout';

export interface TabEditorProps {
  tab: TabConfig;
  onChange: (tab: TabConfig) => void;
  /** 所有可用函数描述符，用于自动推导 */
  descriptors?: FunctionDescriptor[];
}

export default function TabEditor({ tab, onChange, descriptors = [] }: TabEditorProps) {
  const [editingColumn, setEditingColumn] = useState<ColumnConfig | null>(null);
  const [editingField, setEditingField] = useState<FieldConfig | null>(null);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [descriptorPreviewOpen, setDescriptorPreviewOpen] = useState(false);
  const [previewDescriptor, setPreviewDescriptor] = useState<FunctionDescriptor | null>(null);
  const [columnForm] = Form.useForm();
  const [fieldForm] = Form.useForm();
  const { Text } = Typography;

  // 确保 tab.functions 和 tab.layout 存在
  const safeTab = {
    ...tab,
    functions: tab?.functions || [],
    layout: tab?.layout || { type: 'form' },
  };

  const handleBasicChange = (field: string, value: any) => {
    onChange({ ...safeTab, [field]: value });
  };

  const handleLayoutTypeChange = (type: string) => {
    const primaryFunctionId = safeTab.functions[0];
    const primaryDescriptor = descriptors.find((d) => d.id === primaryFunctionId);
    const autoColumns = primaryDescriptor ? schemaToColumns(primaryDescriptor) : [];
    const autoFields = primaryDescriptor ? schemaToFields(primaryDescriptor) : [];
    const autoSections = primaryDescriptor ? schemaToDetailSections(primaryDescriptor) : [];

    let defaultLayout: any = { type };
    switch (type) {
      case 'form-detail':
        defaultLayout = {
          type: 'form-detail',
          queryFunction: primaryFunctionId || '',
          queryFields: autoFields.slice(0, 3),
          detailSections: autoSections,
          actions: [],
        };
        break;
      case 'list':
        defaultLayout = {
          type: 'list',
          listFunction: primaryFunctionId || '',
          columns: autoColumns,
        };
        break;
      case 'form':
        defaultLayout = {
          type: 'form',
          submitFunction: primaryFunctionId || '',
          fields: autoFields,
        };
        break;
      case 'detail':
        defaultLayout = {
          type: 'detail',
          detailFunction: primaryFunctionId || '',
          sections: autoSections,
        };
        break;
      default:
        defaultLayout = { type: 'list', listFunction: '', columns: [] };
        break;
    }
    onChange({ ...safeTab, layout: defaultLayout });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const funcData = e.dataTransfer.getData('function');
    if (!funcData) return;
    try {
      const func: FunctionDescriptor = JSON.parse(funcData);
      // 添加到函数列表
      if (!safeTab.functions.includes(func.id)) {
        const newFunctions = [...safeTab.functions, func.id];
        // 如果是第一个函数，自动推导布局
        if (safeTab.functions.length === 0) {
          const autoLayout = descriptorToLayout(func);
          onChange({ ...safeTab, functions: newFunctions, layout: autoLayout });
          message.success(`已添加函数并自动生成 ${autoLayout.type} 布局`);
        } else {
          onChange({ ...safeTab, functions: newFunctions });
          message.success('函数已添加');
        }
      } else {
        message.warning('函数已存在');
      }
    } catch {
      message.error('添加函数失败');
    }
  };

  const handleRemoveFunction = (functionId: string) => {
    const nextFunctions = safeTab.functions.filter((f) => f !== functionId);
    const nextLayout = { ...(safeTab.layout as any) };
    if (nextLayout.listFunction === functionId) nextLayout.listFunction = '';
    if (nextLayout.submitFunction === functionId) nextLayout.submitFunction = '';
    if (nextLayout.detailFunction === functionId) nextLayout.detailFunction = '';
    if (nextLayout.queryFunction === functionId) nextLayout.queryFunction = '';
    onChange({ ...safeTab, functions: nextFunctions, layout: nextLayout });
  };

  const handlePreviewFunctionJson = (functionId: string) => {
    const descriptor = descriptors.find((d) => d.id === functionId);
    if (!descriptor) {
      message.warning('未找到函数描述符');
      return;
    }
    setPreviewDescriptor(descriptor);
    setDescriptorPreviewOpen(true);
  };

  const beforeMountJsonEditor = (monaco: any) => {
    if (!monaco?.editor || monaco.editor.getTheme?.() === 'sublime-monokai') return;
    monaco.editor.defineTheme('sublime-monokai', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '66D9EF' },
        { token: 'string.value.json', foreground: 'A6E22E' },
        { token: 'number', foreground: 'E6DB74' },
        { token: 'keyword', foreground: 'F92672' },
      ],
      colors: {
        'editor.background': '#272822',
        'editorLineNumber.foreground': '#75715E',
        'editorLineNumber.activeForeground': '#F8F8F2',
      },
    });
  };

  // 自动推导布局（手动触发）
  const handleAutoLayout = () => {
    if (safeTab.functions.length === 0) {
      message.warning('请先添加函数');
      return;
    }
    const firstFuncId = safeTab.functions[0];
    const descriptor = descriptors.find((d) => d.id === firstFuncId);
    if (!descriptor) {
      message.warning('未找到函数描述符，无法自动推导');
      return;
    }
    const autoLayout = descriptorToLayout(descriptor);
    onChange({ ...safeTab, layout: autoLayout });
    message.success(`已自动生成 ${autoLayout.type} 布局`);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card title="基本信息" size="small">
        <Form layout="vertical">
          <Form.Item label="标题">
            <Input
              value={safeTab.title}
              onChange={(e) => handleBasicChange('title', e.target.value)}
              placeholder="请输入标题"
            />
          </Form.Item>
          <Form.Item label="图标">
            <IconPicker value={safeTab.icon} onChange={(val) => handleBasicChange('icon', val)} />
          </Form.Item>
          <Form.Item label="设为默认页">
            <Switch
              checked={Boolean(safeTab.defaultActive)}
              onChange={(checked) => handleBasicChange('defaultActive', checked)}
            />
          </Form.Item>
        </Form>
      </Card>

      <Card
        title="使用的函数"
        size="small"
        extra={<span style={{ fontSize: 12, color: '#999' }}>从左侧拖拽函数到这里</span>}
      >
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            minHeight: 80,
            border: '2px dashed #d9d9d9',
            borderRadius: 4,
            padding: 12,
            backgroundColor: '#fafafa',
          }}
        >
          {safeTab.functions.length > 0 ? (
            <List
              size="small"
              dataSource={safeTab.functions}
              renderItem={(funcId) => {
                const desc = descriptors.find((d) => d.id === funcId);
                return (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handlePreviewFunctionJson(funcId)}
                      >
                        查看 JSON
                      </Button>,
                      <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveFunction(funcId)}
                      />,
                    ]}
                  >
                    <Tag color="blue">{desc?.display_name?.zh || funcId}</Tag>
                    <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>{funcId}</span>
                  </List.Item>
                );
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: '8px 0' }}>
              拖拽函数到这里
            </div>
          )}
        </div>
      </Card>

      <Modal
        title="函数 JSON 预览"
        open={descriptorPreviewOpen}
        footer={null}
        width={860}
        onCancel={() => {
          setDescriptorPreviewOpen(false);
          setPreviewDescriptor(null);
        }}
      >
        {previewDescriptor ? (
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Text strong>{previewDescriptor.id}</Text>
            <Text type="secondary">
              {previewDescriptor.display_name?.zh ||
                previewDescriptor.display_name?.en ||
                previewDescriptor.id}
            </Text>
            <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
              <CodeEditor
                value={JSON.stringify(previewDescriptor, null, 2)}
                language="json"
                height={500}
                readOnly
                theme="sublime-monokai"
                beforeMount={beforeMountJsonEditor}
                options={{
                  lineNumbers: 'on',
                  renderLineHighlight: 'line',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  minimap: { enabled: false },
                }}
              />
            </div>
          </Space>
        ) : null}
      </Modal>

      <Card
        title="布局类型"
        size="small"
        extra={
          <Button
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={handleAutoLayout}
            title="根据第一个函数自动推导布局"
          >
            自动推导
          </Button>
        }
      >
        <Select
          value={safeTab.layout.type}
          onChange={handleLayoutTypeChange}
          style={{ width: '100%' }}
        >
          <Select.Option value="form-detail">表单-详情（查询后展示）</Select.Option>
          <Select.Option value="list">列表</Select.Option>
          <Select.Option value="form">表单（提交操作）</Select.Option>
          <Select.Option value="detail">详情（只读）</Select.Option>
        </Select>
      </Card>

      <Card title="布局配置" size="small">
        {renderLayoutConfig(
          safeTab.layout,
          (layout) => onChange({ ...safeTab, layout }),
          safeTab,
          onChange,
          descriptors,
          { editingColumn, setEditingColumn, columnModalOpen, setColumnModalOpen, columnForm },
          { editingField, setEditingField, fieldModalOpen, setFieldModalOpen, fieldForm },
        )}
      </Card>

      {/* 列编辑 Modal */}
      <Modal
        title={editingColumn ? '编辑列' : '添加列'}
        open={columnModalOpen}
        onOk={async () => {
          const values = await columnForm.validateFields();
          const layout = tab.layout as any;
          const cols: ColumnConfig[] = layout.columns || [];
          if (editingColumn) {
            onChange({
              ...tab,
              layout: {
                ...layout,
                columns: cols.map((c) => (c.key === editingColumn.key ? { ...c, ...values } : c)),
              },
            });
          } else {
            onChange({ ...tab, layout: { ...layout, columns: [...cols, values] } });
          }
          setColumnModalOpen(false);
          columnForm.resetFields();
        }}
        onCancel={() => {
          setColumnModalOpen(false);
          columnForm.resetFields();
        }}
      >
        <Form form={columnForm} layout="vertical">
          <Form.Item name="key" label="字段名" rules={[{ required: true }]}>
            <Input placeholder="如: playerId" />
          </Form.Item>
          <Form.Item name="title" label="列标题" rules={[{ required: true }]}>
            <Input placeholder="如: 玩家ID" />
          </Form.Item>
          <Form.Item name="render" label="渲染方式">
            <Select allowClear placeholder="默认文本">
              {['text', 'status', 'datetime', 'date', 'tag', 'money', 'link', 'image'].map((r) => (
                <Select.Option key={r} value={r}>
                  {r}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="width" label="列宽">
            <Input type="number" placeholder="如: 120" />
          </Form.Item>
          <Form.Item name="sortable" label="可排序" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 字段编辑 Modal */}
      <Modal
        title={editingField ? '编辑字段' : '添加字段'}
        open={fieldModalOpen}
        onOk={async () => {
          const values = await fieldForm.validateFields();
          const layout = tab.layout as any;
          const fieldsKey = layout.type === 'form' ? 'fields' : 'queryFields';
          const fields: FieldConfig[] = layout[fieldsKey] || [];
          if (editingField) {
            onChange({
              ...tab,
              layout: {
                ...layout,
                [fieldsKey]: fields.map((f) =>
                  f.key === editingField.key ? { ...f, ...values } : f,
                ),
              },
            });
          } else {
            onChange({ ...tab, layout: { ...layout, [fieldsKey]: [...fields, values] } });
          }
          setFieldModalOpen(false);
          fieldForm.resetFields();
        }}
        onCancel={() => {
          setFieldModalOpen(false);
          fieldForm.resetFields();
        }}
      >
        <Form form={fieldForm} layout="vertical">
          <Form.Item name="key" label="字段名" rules={[{ required: true }]}>
            <Input placeholder="如: playerId" />
          </Form.Item>
          <Form.Item name="label" label="字段标签" rules={[{ required: true }]}>
            <Input placeholder="如: 玩家ID" />
          </Form.Item>
          <Form.Item name="type" label="字段类型" rules={[{ required: true }]}>
            <Select>
              {['input', 'number', 'select', 'date', 'datetime', 'textarea', 'switch'].map((t) => (
                <Select.Option key={t} value={t}>
                  {t}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="required" label="必填" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="placeholder" label="占位符">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

function renderLayoutConfig(
  layout: any,
  onLayoutChange: (layout: any) => void,
  tab: TabConfig,
  onTabChange: (tab: TabConfig) => void,
  descriptors: FunctionDescriptor[],
  columnCtx: any,
  fieldCtx: any,
): React.ReactNode {
  switch (layout.type) {
    case 'list':
      return renderListConfig(layout, tab, onTabChange, descriptors, columnCtx);
    case 'form-detail':
      return renderFormDetailConfig(layout, tab, onTabChange, descriptors, fieldCtx);
    case 'form':
      return renderFormConfig(layout, tab, onTabChange, descriptors, fieldCtx);
    case 'detail':
      return renderDetailConfig(layout, tab, onTabChange, descriptors);
    default:
      return <div style={{ color: '#999' }}>请选择布局类型</div>;
  }
}

function renderListConfig(
  layout: any,
  tab: TabConfig,
  onChange: (tab: TabConfig) => void,
  descriptors: FunctionDescriptor[],
  { setEditingColumn, setColumnModalOpen, columnForm }: any,
): React.ReactNode {
  const columns: ColumnConfig[] = layout.columns || [];

  const openAdd = () => {
    setEditingColumn(null);
    columnForm.resetFields();
    setColumnModalOpen(true);
  };

  const openEdit = (col: ColumnConfig) => {
    setEditingColumn(col);
    columnForm.setFieldsValue(col);
    setColumnModalOpen(true);
  };

  const removeCol = (key: string) => {
    onChange({ ...tab, layout: { ...layout, columns: columns.filter((c) => c.key !== key) } });
  };

  const autoFill = () => {
    const funcId = layout.listFunction || tab.functions[0];
    const desc = descriptors.find((d) => d.id === funcId);
    if (!desc) {
      message.warning('未找到函数描述符');
      return;
    }
    const cols = schemaToColumns(desc);
    onChange({ ...tab, layout: { ...layout, columns: cols } });
    message.success(`已自动生成 ${cols.length} 列`);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form layout="vertical">
        <Form.Item label="列表函数">
          <Select
            value={layout.listFunction}
            onChange={(v) => onChange({ ...tab, layout: { ...layout, listFunction: v } })}
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
          <Button size="small" icon={<PlusOutlined />} onClick={openAdd}>
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
                  onClick={() => openEdit(col)}
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

function renderFormDetailConfig(
  layout: any,
  tab: TabConfig,
  onChange: (tab: TabConfig) => void,
  descriptors: FunctionDescriptor[],
  { setEditingField, setFieldModalOpen, fieldForm }: any,
): React.ReactNode {
  const queryFields: FieldConfig[] = layout.queryFields || [];

  const openAdd = () => {
    setEditingField(null);
    fieldForm.resetFields();
    setFieldModalOpen(true);
  };

  const openEdit = (f: FieldConfig) => {
    setEditingField(f);
    fieldForm.setFieldsValue(f);
    setFieldModalOpen(true);
  };

  const removeField = (key: string) => {
    onChange({
      ...tab,
      layout: { ...layout, queryFields: queryFields.filter((f) => f.key !== key) },
    });
  };

  const autoFill = () => {
    const funcId = layout.queryFunction || tab.functions[0];
    const desc = descriptors.find((d) => d.id === funcId);
    if (!desc) {
      message.warning('未找到函数描述符');
      return;
    }
    const fields = schemaToFields(desc);
    onChange({ ...tab, layout: { ...layout, queryFields: fields } });
    message.success(`已自动生成 ${fields.length} 个查询字段`);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form layout="vertical">
        <Form.Item label="查询函数">
          <Select
            value={layout.queryFunction}
            onChange={(v) => onChange({ ...tab, layout: { ...layout, queryFunction: v } })}
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
          <Button size="small" icon={<PlusOutlined />} onClick={openAdd}>
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
          { title: '必填', dataIndex: 'required', width: 60, render: (v) => (v ? '是' : '否') },
          {
            title: '操作',
            width: 80,
            render: (_, f) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(f)}
                />
                <Popconfirm title="确认删除？" onConfirm={() => removeField(f.key)}>
                  <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        locale={{ emptyText: '暂无字段' }}
      />
    </Space>
  );
}

function renderFormConfig(
  layout: any,
  tab: TabConfig,
  onChange: (tab: TabConfig) => void,
  descriptors: FunctionDescriptor[],
  { setEditingField, setFieldModalOpen, fieldForm }: any,
): React.ReactNode {
  const fields: FieldConfig[] = layout.fields || [];

  const openAdd = () => {
    setEditingField(null);
    fieldForm.resetFields();
    setFieldModalOpen(true);
  };

  const openEdit = (f: FieldConfig) => {
    setEditingField(f);
    fieldForm.setFieldsValue(f);
    setFieldModalOpen(true);
  };

  const removeField = (key: string) => {
    onChange({ ...tab, layout: { ...layout, fields: fields.filter((f) => f.key !== key) } });
  };

  const autoFill = () => {
    const funcId = layout.submitFunction || tab.functions[0];
    const desc = descriptors.find((d) => d.id === funcId);
    if (!desc) {
      message.warning('未找到函数描述符');
      return;
    }
    const autoFields = schemaToFields(desc);
    onChange({ ...tab, layout: { ...layout, fields: autoFields } });
    message.success(`已自动生成 ${autoFields.length} 个字段`);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form layout="vertical">
        <Form.Item label="提交函数">
          <Select
            value={layout.submitFunction}
            onChange={(v) => onChange({ ...tab, layout: { ...layout, submitFunction: v } })}
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
          <Button size="small" icon={<PlusOutlined />} onClick={openAdd}>
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
          { title: '必填', dataIndex: 'required', width: 60, render: (v) => (v ? '是' : '否') },
          {
            title: '操作',
            width: 80,
            render: (_, f) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(f)}
                />
                <Popconfirm title="确认删除？" onConfirm={() => removeField(f.key)}>
                  <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        locale={{ emptyText: '暂无字段' }}
      />
    </Space>
  );
}

function renderDetailConfig(
  layout: any,
  tab: TabConfig,
  onChange: (tab: TabConfig) => void,
  descriptors: FunctionDescriptor[],
): React.ReactNode {
  return (
    <Form layout="vertical">
      <Form.Item label="详情函数">
        <Select
          value={layout.detailFunction}
          onChange={(v) => onChange({ ...tab, layout: { ...layout, detailFunction: v } })}
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
    </Form>
  );
}
