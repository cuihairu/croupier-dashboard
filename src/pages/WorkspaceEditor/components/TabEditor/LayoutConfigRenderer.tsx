import React, { useState } from 'react';
import {
  Space,
  Form,
  Select,
  Button,
  Table,
  Popconfirm,
  message,
  Input,
  Upload,
  Tooltip,
  Collapse,
  Modal,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  HolderOutlined,
  ExportOutlined,
  ImportOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import type { TabConfig, ColumnConfig, FieldConfig } from '@/types/workspace';
import type { FunctionDescriptor } from '@/services/api/functions';
import {
  schemaToColumns,
  schemaToDetailSections,
  schemaToFields,
} from '../../utils/schemaToLayout';
import { HelpTooltip } from '../HelpTooltip';
import FieldLibrary, { createFieldFromTemplate, type FieldTemplate } from '../FieldLibrary';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableTableProps<T extends { key: string }> {
  dataSource: T[];
  columns: any[];
  onReorder: (items: T[]) => void;
  locale?: { emptyText: string };
}

const SortableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { 'data-row-key'?: string }
>(({ 'data-row-key': rowKey, ...props }, _ref) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, over } =
    useSortable({
      id: rowKey || '',
    });
  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: over ? '#e6f7ff' : undefined,
  };
  return <tr ref={setNodeRef} {...props} {...attributes} style={style} />;
});

function DraggableTable<T extends { key: string }>({
  dataSource,
  columns,
  onReorder,
  locale,
}: DraggableTableProps<T>) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = dataSource.findIndex((r) => r.key === active.id);
    const newIndex = dataSource.findIndex((r) => r.key === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(dataSource, oldIndex, newIndex));
    }
  };

  const dragHandleCol = {
    title: '',
    dataIndex: '_drag',
    width: 32,
    render: (_: any, record: T) => <DragHandle rowKey={record.key} />,
  };

  const activeItem = activeId ? dataSource.find((item) => item.key === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={dataSource.map((r) => r.key)} strategy={verticalListSortingStrategy}>
        <Table
          size="small"
          dataSource={dataSource}
          rowKey="key"
          pagination={false}
          columns={[dragHandleCol, ...columns]}
          locale={locale}
          components={{
            body: {
              row: SortableRow,
            },
          }}
        />
      </SortableContext>
      <DragOverlay>
        {activeItem && (
          <div
            style={{
              background: '#fff',
              padding: '8px 16px',
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '2px solid #1677ff',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 200,
            }}
          >
            <HolderOutlined style={{ color: '#999' }} />
            <span style={{ fontSize: 12 }}>
              {columns[0]?.render?.(undefined, activeItem) || activeItem.key}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function DragHandle({ rowKey }: { rowKey: string }) {
  const { listeners, attributes } = useSortable({ id: rowKey });
  return (
    <HolderOutlined
      {...listeners}
      {...attributes}
      style={{ cursor: 'grab', color: '#999', touchAction: 'none' }}
    />
  );
}

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
  const handleExportLayout = () => {
    const json = JSON.stringify(tab.layout, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab.key || 'tab'}-layout.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('布局配置已导出');
  };

  const handleImportLayout = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed || typeof parsed !== 'object' || !parsed.type) {
          message.error('无效的布局配置文件：缺少 type 字段');
          return;
        }
        onTabChange({ ...tab, layout: parsed });
        message.success('布局配置已导入');
      } catch {
        message.error('JSON 解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    return false; // prevent upload
  };

  const layoutContent = (() => {
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
  })();

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Tooltip title="导出当前 Tab 布局配置为 JSON 文件">
          <Button size="small" icon={<ExportOutlined />} onClick={handleExportLayout}>
            导出布局
          </Button>
        </Tooltip>
        <Upload accept=".json" showUploadList={false} beforeUpload={handleImportLayout}>
          <Tooltip title="从 JSON 文件导入布局配置（将覆盖当前配置）">
            <Button size="small" icon={<ImportOutlined />}>
              导入布局
            </Button>
          </Tooltip>
        </Upload>
      </Space>
      {layoutContent}
    </div>
  );
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

  const reorderCols = (next: ColumnConfig[]) => {
    onTabChange({ ...tab, layout: { ...layout, columns: next } });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form layout="vertical">
        <Form.Item
          label={
            <Space size={4}>
              <span>列表函数</span>
              <HelpTooltip helpKey="layout.listFunction" />
            </Space>
          }
        >
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
      <DraggableTable
        dataSource={columns}
        onReorder={reorderCols}
        columns={[
          { title: '字段名', dataIndex: 'key', width: 100 },
          { title: '标题', dataIndex: 'title', width: 100 },
          { title: '渲染', dataIndex: 'render', width: 80, render: (v: any) => v || 'text' },
          {
            title: '操作',
            width: 80,
            render: (_: any, col: ColumnConfig) => (
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

  const reorderFields = (next: FieldConfig[]) => {
    onTabChange({ ...tab, layout: { ...layout, queryFields: next } });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form layout="vertical">
        <Form.Item
          label={
            <Space size={4}>
              <span>查询函数</span>
              <HelpTooltip helpKey="layout.queryFunction" />
            </Space>
          }
        >
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
      <DraggableTable
        dataSource={queryFields}
        onReorder={reorderFields}
        columns={[
          { title: '字段名', dataIndex: 'key', width: 100 },
          { title: '标签', dataIndex: 'label', width: 100 },
          { title: '类型', dataIndex: 'type', width: 80 },
          {
            title: '操作',
            width: 80,
            render: (_: any, field: FieldConfig) => (
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
  const [fieldLibraryVisible, setFieldLibraryVisible] = useState(false);

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

  const reorderFields = (next: FieldConfig[]) => {
    onTabChange({ ...tab, layout: { ...layout, fields: next } });
  };

  // 从字段库添加字段
  const handleAddFieldFromTemplate = (template: FieldTemplate) => {
    const existingKeys = fields.map((f) => f.key);
    const newField = createFieldFromTemplate(template, existingKeys);
    onTabChange({
      ...tab,
      layout: { ...layout, fields: [...fields, newField] },
    });
    message.success(`已添加字段: ${newField.label}`);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form layout="vertical">
        <Form.Item
          label={
            <Space size={4}>
              <span>提交函数</span>
              <HelpTooltip helpKey="layout.submitFunction" />
            </Space>
          }
        >
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
          <Button
            size="small"
            icon={<AppstoreOutlined />}
            onClick={() => setFieldLibraryVisible(true)}
          >
            字段库
          </Button>
          <Button size="small" icon={<PlusOutlined />} onClick={() => onOpenFieldEditor(null)}>
            添加字段
          </Button>
        </Space>
      </div>
      <DraggableTable
        dataSource={fields}
        onReorder={reorderFields}
        columns={[
          { title: '字段名', dataIndex: 'key', width: 100 },
          { title: '标签', dataIndex: 'label', width: 100 },
          { title: '类型', dataIndex: 'type', width: 80 },
          {
            title: '操作',
            width: 80,
            render: (_: any, field: FieldConfig) => (
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
      <Modal
        title="从字段库添加"
        open={fieldLibraryVisible}
        onCancel={() => setFieldLibraryVisible(false)}
        footer={null}
        width={400}
      >
        <FieldLibrary
          onFieldClick={(template) => {
            handleAddFieldFromTemplate(template);
            setFieldLibraryVisible(false);
          }}
        />
      </Modal>
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
  const sections = layout.sections || [];

  const removeSection = (index: number) => {
    const nextSections = sections.filter((_, i) => i !== index);
    onTabChange({ ...tab, layout: { ...layout, sections: nextSections } });
  };

  const addSection = () => {
    const newSection = {
      title: `分区 ${sections.length + 1}`,
      fields: [],
    };
    onTabChange({ ...tab, layout: { ...layout, sections: [...sections, newSection] } });
  };

  const updateSection = (index: number, key: string, value: any) => {
    const nextSections = [...sections];
    nextSections[index] = { ...nextSections[index], [key]: value };
    onTabChange({ ...tab, layout: { ...layout, sections: nextSections } });
  };

  const reorderSections = (nextSections: any[]) => {
    onTabChange({ ...tab, layout: { ...layout, sections: nextSections } });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form layout="vertical">
        <Form.Item
          label={
            <Space size={4}>
              <span>详情函数</span>
              <HelpTooltip helpKey="layout.detailFunction" />
            </Space>
          }
        >
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
      </Form>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 500 }}>分区配置 ({sections.length})</span>
        <Button size="small" icon={<PlusOutlined />} onClick={addSection}>
          添加分区
        </Button>
      </div>

      <DraggableTable
        dataSource={sections.map((s: any, i: number) => ({ ...s, key: String(i) }))}
        onReorder={reorderSections}
        columns={[
          {
            title: '标题',
            dataIndex: 'title',
            width: 120,
            render: (v: any, rec: any, index: number) => (
              <Input
                size="small"
                value={v}
                onChange={(e) => updateSection(Number(rec.key), 'title', e.target.value)}
                placeholder="分区标题"
              />
            ),
          },
          {
            title: '字段数',
            dataIndex: 'fields',
            width: 80,
            render: (fields: any[]) => fields?.length || 0,
          },
          {
            title: '操作',
            width: 60,
            render: (_: any, rec: any) => (
              <Popconfirm title="确认删除？" onConfirm={() => removeSection(Number(rec.key))}>
                <Button type="link" danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]}
        locale={{ emptyText: '暂无分区，点击添加或切换到 JSON 编辑' }}
      />

      <Collapse ghost size="small">
        <Collapse.Panel header="JSON 编辑" key="json">
          <Input.TextArea
            rows={6}
            value={JSON.stringify(sections, null, 2)}
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
        </Collapse.Panel>
      </Collapse>
    </Space>
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
