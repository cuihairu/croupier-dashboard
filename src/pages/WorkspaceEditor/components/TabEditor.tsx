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
  Tooltip,
  Segmented,
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

const LAYOUT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'form-detail', label: '表单-详情（查询后展示）' },
  { value: 'list', label: '列表' },
  { value: 'form', label: '表单（提交操作）' },
  { value: 'detail', label: '详情（只读）' },
  { value: 'kanban', label: '看板' },
  { value: 'timeline', label: '时间线' },
  { value: 'split', label: '主从分栏' },
  { value: 'wizard', label: '向导流程' },
  { value: 'dashboard', label: '仪表盘' },
  { value: 'grid', label: '网格布局' },
  { value: 'custom', label: '自定义布局' },
];

const TAB_SCENARIO_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'player_list_ops', label: '玩家运营列表' },
  { value: 'player_detail_profile', label: '玩家详情档案' },
  { value: 'ops_kanban_flow', label: '运营看板流程' },
  { value: 'activity_wizard', label: '活动配置向导' },
];

type ScenarioId = 'player_list_ops' | 'player_detail_profile' | 'ops_kanban_flow' | 'activity_wizard';
type ScenarioRecommendation = {
  id: ScenarioId;
  confidence: number;
  reasons: string[];
};
type QuickLayoutMode = 'list' | 'form' | 'detail' | 'form-detail';
type OrchestratorMode = 'list' | 'form-detail' | 'split' | 'dashboard';
type OrchestratorRole = 'list' | 'detail' | 'submit' | 'query' | 'data';
type OrchestratorBindings = Record<OrchestratorRole, string>;

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
  const [layoutWizardDescriptor, setLayoutWizardDescriptor] = useState<FunctionDescriptor | null>(null);
  const [orchestratorOpen, setOrchestratorOpen] = useState(false);
  const [orchestratorMode, setOrchestratorMode] = useState<OrchestratorMode>('form-detail');
  const [orchestratorBindings, setOrchestratorBindings] = useState<OrchestratorBindings | null>(null);
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
    const defaultLayout = createDefaultLayout(type, primaryFunctionId, primaryDescriptor);
    onChange({ ...safeTab, layout: defaultLayout });
  };

  const handleApplyScenario = (scenarioId: string) => {
    const primaryFunctionId = safeTab.functions[0] || '';
    const scenarioLayout = createScenarioLayout(scenarioId, primaryFunctionId);
    if (!scenarioLayout) {
      message.warning('未识别的场景模板');
      return;
    }
    onChange({ ...safeTab, layout: scenarioLayout });
    message.success(`已应用场景模板：${TAB_SCENARIO_OPTIONS.find((x) => x.value === scenarioId)?.label}`);
  };

  const recommendedScenario = React.useMemo((): ScenarioRecommendation | null => {
    const funcDescriptors = safeTab.functions
      .map((id) => descriptors.find((d) => d.id === id))
      .filter(Boolean) as FunctionDescriptor[];
    if (funcDescriptors.length === 0) return null;
    return detectRecommendedScenario(funcDescriptors);
  }, [safeTab.functions, descriptors]);

  const handleApplyFunctionLayout = (descriptor: FunctionDescriptor, mode: QuickLayoutMode) => {
    const layout = createDefaultLayout(mode, descriptor.id, descriptor);
    const nextFunctions = safeTab.functions.includes(descriptor.id)
      ? safeTab.functions
      : [...safeTab.functions, descriptor.id];
    onChange({ ...safeTab, functions: nextFunctions, layout });
    setLayoutWizardDescriptor(null);
    message.success(`已基于 ${descriptor.display_name?.zh || descriptor.id} 生成 ${mode} 布局`);
  };

  const orchestrationPlan = React.useMemo(
    () => buildOrchestrationLayout(orchestratorMode, safeTab.functions, descriptors, orchestratorBindings),
    [orchestratorMode, safeTab.functions, descriptors, orchestratorBindings],
  );

  const defaultBindings = React.useMemo(
    () => buildDefaultOrchestratorBindings(safeTab.functions, descriptors),
    [safeTab.functions, descriptors],
  );

  React.useEffect(() => {
    if (!orchestratorOpen) return;
    setOrchestratorBindings(defaultBindings);
  }, [orchestratorOpen, defaultBindings]);

  const handleApplyOrchestration = () => {
    if (!orchestrationPlan) {
      message.warning('当前函数不足，无法生成编排方案');
      return;
    }
    onChange({ ...safeTab, layout: orchestrationPlan.layout });
    setOrchestratorOpen(false);
    message.success(`已应用多函数编排：${orchestratorMode}`);
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
          const nextTab = healTabLayoutWithTemplate(
            { ...safeTab, functions: newFunctions },
            descriptors,
          );
          onChange(nextTab);
          message.success('函数已添加并自动补全布局缺失配置');
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
    const nextTab = healTabLayoutWithTemplate(
      { ...safeTab, functions: nextFunctions, layout: nextLayout },
      descriptors,
    );
    onChange(nextTab);
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

  const handleHealLayout = () => {
    const nextTab = healTabLayoutWithTemplate(safeTab, descriptors);
    onChange(nextTab);
    message.success('已补全当前布局缺失配置');
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
                        size="small"
                        onClick={() => {
                          const d = descriptors.find((x) => x.id === funcId);
                          if (!d) {
                            message.warning('未找到函数描述符');
                            return;
                          }
                          setLayoutWizardDescriptor(d);
                        }}
                      >
                        界面向导
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

      <Modal
        title={`界面向导: ${layoutWizardDescriptor?.display_name?.zh || layoutWizardDescriptor?.id || ''}`}
        open={!!layoutWizardDescriptor}
        footer={null}
        onCancel={() => setLayoutWizardDescriptor(null)}
      >
        {layoutWizardDescriptor && (
          <Space wrap>
            <Button onClick={() => handleApplyFunctionLayout(layoutWizardDescriptor, 'list')}>
              生成列表界面
            </Button>
            <Button onClick={() => handleApplyFunctionLayout(layoutWizardDescriptor, 'form')}>
              生成表单界面
            </Button>
            <Button onClick={() => handleApplyFunctionLayout(layoutWizardDescriptor, 'detail')}>
              生成详情界面
            </Button>
            <Button onClick={() => handleApplyFunctionLayout(layoutWizardDescriptor, 'form-detail')}>
              生成查询详情界面
            </Button>
          </Space>
        )}
      </Modal>

      <Card
        title="布局类型"
        size="small"
        extra={
          <Space>
            {recommendedScenario && (
              <>
                <Tooltip title={recommendedScenario.reasons.join('；')}>
                  <Tag color="gold">
                    推荐: {getScenarioLabel(recommendedScenario.id)} ({recommendedScenario.confidence}%)
                  </Tag>
                </Tooltip>
                <Button size="small" onClick={() => handleApplyScenario(recommendedScenario.id)}>
                  应用推荐
                </Button>
              </>
            )}
            <Select
              size="small"
              placeholder="场景模板"
              style={{ width: 180 }}
              onChange={handleApplyScenario}
              options={TAB_SCENARIO_OPTIONS}
              allowClear
            />
            <Button
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={handleHealLayout}
              title="补全当前布局缺失配置"
            >
              一键补全
            </Button>
            <Button
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={handleAutoLayout}
              title="根据第一个函数自动推导布局"
            >
              自动推导
            </Button>
            <Button size="small" onClick={() => setOrchestratorOpen(true)}>
              编排向导
            </Button>
          </Space>
        }
      >
        <Select
          value={safeTab.layout.type}
          onChange={handleLayoutTypeChange}
          style={{ width: '100%' }}
        >
          {LAYOUT_OPTIONS.map((opt) => (
            <Select.Option key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Option>
          ))}
        </Select>
      </Card>

      <Modal
        title="多函数编排向导"
        open={orchestratorOpen}
        onCancel={() => setOrchestratorOpen(false)}
        onOk={handleApplyOrchestration}
        okText="应用方案"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Segmented
            block
            value={orchestratorMode}
            onChange={(v) => setOrchestratorMode(v as OrchestratorMode)}
            options={[
              { label: '标准列表', value: 'list' },
              { label: '查询详情', value: 'form-detail' },
              { label: '主从分栏', value: 'split' },
              { label: '仪表盘', value: 'dashboard' },
            ]}
          />
          {orchestrationPlan ? (
            <>
              <div style={{ fontSize: 12, color: '#999' }}>角色绑定（可手动调整）</div>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {(['list', 'detail', 'submit', 'query', 'data'] as OrchestratorRole[]).map((role) => (
                  <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 64 }}>{role}</div>
                    <Select
                      value={orchestratorBindings?.[role]}
                      style={{ flex: 1 }}
                      options={safeTab.functions.map((fid) => {
                        const d = descriptors.find((x) => x.id === fid);
                        return { value: fid, label: d?.display_name?.zh || fid };
                      })}
                      onChange={(v) =>
                        setOrchestratorBindings((prev) => ({
                          ...(prev || defaultBindings),
                          [role]: v,
                        }))
                      }
                    />
                  </div>
                ))}
              </Space>
              <div style={{ fontSize: 12, color: '#999' }}>函数角色分配</div>
              <div style={{ fontSize: 13 }}>
                {orchestrationPlan.assignments.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: '#999' }}>请先在当前 Tab 添加至少一个函数</div>
          )}
        </Space>
      </Modal>

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

function createDefaultLayout(
  type: string,
  primaryFunctionId: string,
  primaryDescriptor?: FunctionDescriptor,
): any {
  const autoColumns = primaryDescriptor ? schemaToColumns(primaryDescriptor) : [];
  const autoFields = primaryDescriptor ? schemaToFields(primaryDescriptor) : [];
  const autoSections = primaryDescriptor ? schemaToDetailSections(primaryDescriptor) : [];
  const fallbackColumns = [
    { key: 'id', title: 'ID' },
    { key: 'name', title: '名称' },
    { key: 'status', title: '状态' },
    { key: 'updatedAt', title: '更新时间', render: 'datetime' },
  ];
  const fallbackFields = [
    { key: 'name', label: '名称', type: 'input', required: true },
    { key: 'status', label: '状态', type: 'select' },
  ];
  const fallbackSections = [
    {
      title: '基础信息',
      column: 2,
      fields: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: '名称' },
        { key: 'status', label: '状态' },
      ],
    },
  ];
  const defaultColumns = autoColumns.length > 0 ? autoColumns : fallbackColumns;
  const defaultFields = autoFields.length > 0 ? autoFields : fallbackFields;
  const defaultSections = autoSections.length > 0 ? autoSections : fallbackSections;
  switch (type) {
    case 'form-detail':
      return {
        type: 'form-detail',
        queryFunction: primaryFunctionId || '',
        queryFields: defaultFields.slice(0, 3),
        detailSections: defaultSections,
        actions: [],
      };
    case 'list':
      return {
        type: 'list',
        listFunction: primaryFunctionId || '',
        columns: defaultColumns,
      };
    case 'form':
      return {
        type: 'form',
        submitFunction: primaryFunctionId || '',
        fields: defaultFields,
      };
    case 'detail':
      return {
        type: 'detail',
        detailFunction: primaryFunctionId || '',
        sections: defaultSections,
      };
    case 'kanban':
      return {
        type: 'kanban',
        dataFunction: primaryFunctionId || '',
        columns: [
          { id: 'todo', title: '待处理', color: '#1677ff' },
          { id: 'processing', title: '处理中', color: '#faad14' },
          { id: 'done', title: '已完成', color: '#52c41a' },
        ],
      };
    case 'timeline':
      return {
        type: 'timeline',
        dataFunction: primaryFunctionId || '',
        showFilter: true,
        reverse: true,
      };
    case 'split':
      return {
        type: 'split',
        direction: 'horizontal',
        panels: [
          {
            key: 'left',
            title: '主列表',
            span: 12,
            component: {
              type: 'list',
              config: { listFunction: primaryFunctionId || '', columns: defaultColumns },
            },
          },
          {
            key: 'right',
            title: '详情',
            span: 12,
            component: {
              type: 'detail',
              config: { detailFunction: primaryFunctionId || '', sections: defaultSections },
            },
          },
        ],
      };
    case 'wizard':
      return {
        type: 'wizard',
        steps: [
          {
            key: 'step1',
            title: '第一步',
            component: {
              type: 'form',
              config: { submitFunction: primaryFunctionId || '', fields: defaultFields },
            },
          },
          {
            key: 'step2',
            title: '第二步',
            component: {
              type: 'detail',
              config: { detailFunction: primaryFunctionId || '', sections: defaultSections },
            },
          },
        ],
      };
    case 'dashboard':
      return {
        type: 'dashboard',
        stats: [
          { key: 'online', title: '在线人数', value: 0 },
          { key: 'dau', title: 'DAU', value: 0 },
        ],
        panels: [
          {
            key: 'panel-list',
            title: '数据列表',
            span: 12,
            component: {
              type: 'list',
              config: { listFunction: primaryFunctionId || '', columns: defaultColumns },
            },
          },
          {
            key: 'panel-detail',
            title: '详情',
            span: 12,
            component: {
              type: 'detail',
              config: { detailFunction: primaryFunctionId || '', sections: defaultSections },
            },
          },
        ],
      };
    case 'grid':
      return {
        type: 'grid',
        columns: 2,
        gutter: [16, 16],
        items: [
          {
            key: 'item-list',
            colSpan: 1,
            component: {
              type: 'list',
              config: { listFunction: primaryFunctionId || '', columns: defaultColumns },
            },
          },
          {
            key: 'item-detail',
            colSpan: 1,
            component: {
              type: 'detail',
              config: { detailFunction: primaryFunctionId || '', sections: defaultSections },
            },
          },
        ],
      };
    case 'custom':
      return {
        type: 'custom',
        component: 'CustomPanel',
        props: {},
      };
    default:
      return { type: 'list', listFunction: '', columns: [] };
  }
}

function createScenarioLayout(scenarioId: string, primaryFunctionId: string): any | null {
  switch (scenarioId) {
    case 'player_list_ops':
      return {
        type: 'list',
        listFunction: primaryFunctionId || '',
        columns: [
          { key: 'playerId', title: '玩家ID' },
          { key: 'nickname', title: '昵称' },
          { key: 'serverId', title: '服务器' },
          { key: 'level', title: '等级' },
          { key: 'vip', title: 'VIP' },
          { key: 'status', title: '状态' },
          { key: 'updatedAt', title: '更新时间', render: 'datetime' },
        ],
      };
    case 'player_detail_profile':
      return {
        type: 'detail',
        detailFunction: primaryFunctionId || '',
        sections: [
          {
            title: '基础信息',
            column: 2,
            fields: [
              { key: 'playerId', label: '玩家ID' },
              { key: 'nickname', label: '昵称' },
              { key: 'serverId', label: '服务器' },
              { key: 'level', label: '等级' },
              { key: 'vip', label: 'VIP' },
              { key: 'registerAt', label: '注册时间' },
            ],
          },
          {
            title: '行为信息',
            column: 2,
            fields: [
              { key: 'lastLoginAt', label: '最后登录' },
              { key: 'onlineDuration', label: '在线时长' },
              { key: 'payTotal', label: '累计付费' },
              { key: 'status', label: '状态' },
            ],
          },
        ],
      };
    case 'ops_kanban_flow':
      return {
        type: 'kanban',
        dataFunction: primaryFunctionId || '',
        columns: [
          { id: 'todo', title: '待处理', color: '#1677ff' },
          { id: 'processing', title: '处理中', color: '#faad14' },
          { id: 'review', title: '待复核', color: '#722ed1' },
          { id: 'done', title: '已完成', color: '#52c41a' },
        ],
      };
    case 'activity_wizard':
      return {
        type: 'wizard',
        steps: [
          {
            key: 'basic',
            title: '基础配置',
            component: {
              type: 'form',
              config: {
                submitFunction: primaryFunctionId || '',
                fields: [
                  { key: 'activityName', label: '活动名', type: 'input', required: true },
                  { key: 'startAt', label: '开始时间', type: 'datetime', required: true },
                  { key: 'endAt', label: '结束时间', type: 'datetime', required: true },
                ],
              },
            },
          },
          {
            key: 'reward',
            title: '奖励配置',
            component: {
              type: 'form',
              config: {
                submitFunction: primaryFunctionId || '',
                fields: [
                  { key: 'poolId', label: '奖池ID', type: 'input', required: true },
                  { key: 'weightRule', label: '权重规则', type: 'textarea' },
                ],
              },
            },
          },
          {
            key: 'confirm',
            title: '发布确认',
            component: {
              type: 'detail',
              config: {
                detailFunction: primaryFunctionId || '',
                sections: [
                  {
                    title: '发布预览',
                    fields: [
                      { key: 'activityName', label: '活动名' },
                      { key: 'startAt', label: '开始时间' },
                      { key: 'endAt', label: '结束时间' },
                      { key: 'status', label: '状态' },
                    ],
                  },
                ],
              },
            },
          },
        ],
      };
    default:
      return null;
  }
}

function getScenarioLabel(id: string): string {
  return TAB_SCENARIO_OPTIONS.find((x) => x.value === id)?.label || id;
}

function detectRecommendedScenario(descriptors: FunctionDescriptor[]): ScenarioRecommendation {
  const scores: Record<ScenarioId, number> = {
    player_list_ops: 0,
    player_detail_profile: 0,
    ops_kanban_flow: 0,
    activity_wizard: 0,
  };
  const reasons: Record<ScenarioId, string[]> = {
    player_list_ops: [],
    player_detail_profile: [],
    ops_kanban_flow: [],
    activity_wizard: [],
  };

  descriptors.forEach((descriptor) => {
    const idText = String(descriptor.id || '').toLowerCase();
    const opText = String(descriptor.operation || '').toLowerCase();
    const tagsText = (descriptor.tags || []).join(',').toLowerCase();
    const summaryText = `${descriptor.summary?.zh || ''} ${descriptor.summary?.en || ''}`.toLowerCase();
    const allText = `${idText} ${opText} ${tagsText} ${summaryText}`;
    const inputScore = estimateInputComplexity(descriptor);

    const hitAny = (keywords: string[]) => keywords.some((kw) => allText.includes(kw));
    const opName = descriptor.operation || 'unknown';

    if (hitAny(['wizard', 'step', 'publish', 'approve', 'workflow', 'activity', 'campaign'])) {
      scores.activity_wizard += 9;
      reasons.activity_wizard.push(`${descriptor.id}: 命中流程/发布关键词`);
    }
    if (hitAny(['kanban', 'board', 'ticket', 'task', 'issue'])) {
      scores.ops_kanban_flow += 9;
      reasons.ops_kanban_flow.push(`${descriptor.id}: 命中看板/任务关键词`);
    }
    if (hitAny(['detail', 'profile', 'info', 'get', 'query']) && !hitAny(['list', 'page', 'search'])) {
      scores.player_detail_profile += 8;
      reasons.player_detail_profile.push(`${descriptor.id}: 偏详情查询函数`);
    }
    if (hitAny(['player', 'gm', 'ban', 'mute', 'mail', 'inventory', 'list', 'search', 'page'])) {
      scores.player_list_ops += 8;
      reasons.player_list_ops.push(`${descriptor.id}: 偏运营列表函数`);
    }

    if (inputScore >= 4) {
      scores.activity_wizard += 4;
      reasons.activity_wizard.push(`${descriptor.id}: 输入复杂度高(${inputScore})`);
    } else if (inputScore > 0) {
      scores.player_list_ops += 1;
      reasons.player_list_ops.push(`${descriptor.id}: 输入复杂度较低(${inputScore})`);
    }

    if (opName.includes('list') || opName.includes('search')) {
      scores.player_list_ops += 3;
    }
    if (opName.includes('get') || opName.includes('detail')) {
      scores.player_detail_profile += 3;
    }
    if (opName.includes('create') || opName.includes('update') || opName.includes('submit')) {
      scores.activity_wizard += 2;
    }
  });

  const sorted = (Object.keys(scores) as ScenarioId[]).sort((a, b) => scores[b] - scores[a]);
  const top = sorted[0];
  const second = sorted[1];
  const base = 55;
  const gap = Math.max(0, scores[top] - scores[second]);
  const confidence = clampConfidence(base + scores[top] * 2 + gap * 2);
  const topReasons = reasons[top].slice(0, 3);

  return {
    id: top,
    confidence,
    reasons:
      topReasons.length > 0
        ? topReasons
        : [`基于 ${descriptors.length} 个函数的综合特征，采用默认推荐`],
  };
}

function estimateInputComplexity(descriptor: FunctionDescriptor): number {
  const schemaText = String(descriptor.input_schema || '');
  if (!schemaText) return 0;
  try {
    const schema = JSON.parse(schemaText);
    const props = schema?.properties || schema?.input?.properties || {};
    const propCount = Object.keys(props || {}).length;
    const hasNested = Object.values(props || {}).some(
      (p: any) => p?.type === 'object' || p?.type === 'array',
    );
    return propCount + (hasNested ? 2 : 0);
  } catch {
    return schemaText.length > 120 ? 3 : 1;
  }
}

function clampConfidence(value: number): number {
  return Math.max(50, Math.min(95, Math.round(value)));
}

function buildOrchestrationLayout(
  mode: OrchestratorMode,
  functionIds: string[],
  descriptors: FunctionDescriptor[],
  manualBindings?: OrchestratorBindings | null,
): { layout: any; assignments: string[] } | null {
  if (!Array.isArray(functionIds) || functionIds.length === 0) return null;
  const descs = functionIds
    .map((id) => descriptors.find((d) => d.id === id))
    .filter(Boolean) as FunctionDescriptor[];
  if (descs.length === 0) return null;

  const defaults = buildDefaultOrchestratorBindings(functionIds, descriptors);
  const binding = manualBindings || defaults;
  const listFn = binding.list || defaults.list;
  const detailFn = binding.detail || defaults.detail;
  const submitFn = binding.submit || defaults.submit;
  const queryFn = binding.query || defaults.query;
  const dataFn = binding.data || defaults.data;

  const findDesc = (id: string) => descs.find((d) => d.id === id);
  const listDesc = findDesc(listFn);
  const detailDesc = findDesc(detailFn);
  const submitDesc = findDesc(submitFn);
  const queryDesc = findDesc(queryFn);

  const listColumns = listDesc ? schemaToColumns(listDesc) : [];
  const detailSections = detailDesc ? schemaToDetailSections(detailDesc) : [];
  const submitFields = submitDesc ? schemaToFields(submitDesc) : [];
  const queryFields = queryDesc ? schemaToFields(queryDesc).slice(0, 4) : [];

  const assignments = [
    `list -> ${listFn}`,
    `detail -> ${detailFn}`,
    `submit -> ${submitFn}`,
    `query -> ${queryFn}`,
    `data -> ${dataFn}`,
  ];

  if (mode === 'list') {
    return {
      layout: {
        type: 'list',
        listFunction: listFn,
        columns: listColumns.length > 0 ? listColumns : [{ key: 'id', title: 'ID' }],
      },
      assignments,
    };
  }
  if (mode === 'split') {
    return {
      layout: {
        type: 'split',
        direction: 'horizontal',
        panels: [
          {
            key: 'left',
            title: '列表',
            span: 12,
            component: {
              type: 'list',
              config: {
                listFunction: listFn,
                columns: listColumns.length > 0 ? listColumns : [{ key: 'id', title: 'ID' }],
              },
            },
          },
          {
            key: 'right',
            title: '详情',
            span: 12,
            component: {
              type: 'detail',
              config: {
                detailFunction: detailFn,
                sections:
                  detailSections.length > 0
                    ? detailSections
                    : [{ title: '基础信息', fields: [{ key: 'id', label: 'ID' }] }],
              },
            },
          },
        ],
      },
      assignments,
    };
  }
  if (mode === 'dashboard') {
    return {
      layout: {
        type: 'dashboard',
        stats: [
          { key: 'online', title: '在线人数', value: 0 },
          { key: 'dau', title: 'DAU', value: 0 },
        ],
        panels: [
          {
            key: 'list',
            title: '列表',
            span: 12,
            component: {
              type: 'list',
              config: {
                listFunction: listFn,
                columns: listColumns.length > 0 ? listColumns : [{ key: 'id', title: 'ID' }],
              },
            },
          },
          {
            key: 'detail',
            title: '详情',
            span: 12,
            component: {
              type: 'detail',
              config: {
                detailFunction: detailFn,
                sections:
                  detailSections.length > 0
                    ? detailSections
                    : [{ title: '基础信息', fields: [{ key: 'id', label: 'ID' }] }],
              },
            },
          },
        ],
      },
      assignments,
    };
  }

  return {
    layout: {
      type: 'form-detail',
      queryFunction: queryFn,
      queryFields: queryFields.length > 0 ? queryFields : [{ key: 'keyword', label: '关键字', type: 'input' }],
      detailSections:
        detailSections.length > 0
          ? detailSections
          : [{ title: '基础信息', fields: [{ key: 'id', label: 'ID' }] }],
      actions: submitFn
        ? [
            {
              key: 'submit',
              label: '提交',
              type: 'modal',
              function: submitFn,
              fields: submitFields.slice(0, 6),
            },
          ]
        : [],
    },
    assignments,
  };
}

function pickFunctionByRole(
  descriptors: FunctionDescriptor[],
  role: OrchestratorRole,
): FunctionDescriptor | null {
  if (!descriptors.length) return null;
  const roleKeywords: Record<string, string[]> = {
    list: ['list', 'search', 'page', 'inventory', 'mail'],
    detail: ['detail', 'profile', 'info', 'get'],
    submit: ['create', 'update', 'submit', 'save', 'ban', 'mute', 'send'],
    query: ['query', 'search', 'find', 'get'],
    data: ['stats', 'analytics', 'timeline', 'kanban', 'report', 'data'],
  };
  const kws = roleKeywords[role] || [];
  let best: FunctionDescriptor = descriptors[0];
  let bestScore = -1;
  descriptors.forEach((d) => {
    const text = `${d.id || ''} ${d.operation || ''} ${(d.tags || []).join(' ')} ${
      d.summary?.zh || ''
    } ${d.summary?.en || ''}`.toLowerCase();
    let score = 0;
    kws.forEach((kw) => {
      if (text.includes(kw)) score += 2;
    });
    if (role === 'submit' && estimateInputComplexity(d) >= 2) score += 2;
    if ((role === 'list' || role === 'query') && estimateInputComplexity(d) <= 2) score += 1;
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  });
  return best;
}

function buildDefaultOrchestratorBindings(
  functionIds: string[],
  descriptors: FunctionDescriptor[],
): OrchestratorBindings {
  const descs = functionIds
    .map((id) => descriptors.find((d) => d.id === id))
    .filter(Boolean) as FunctionDescriptor[];
  const first = descs[0]?.id || functionIds[0] || '';
  const pick = (role: OrchestratorRole) => pickFunctionByRole(descs, role)?.id || first;
  return {
    list: pick('list'),
    detail: pick('detail'),
    submit: pick('submit'),
    query: pick('query'),
    data: pick('data'),
  };
}

function healTabLayoutWithTemplate(tab: TabConfig, descriptors: FunctionDescriptor[]): TabConfig {
  const functions = Array.isArray(tab.functions) ? tab.functions : [];
  const primaryFunctionId = functions[0] || '';
  const primaryDescriptor = descriptors.find((d) => d.id === primaryFunctionId);
  const layout: any = tab.layout || { type: 'form' };
  const type = layout.type || 'form';
  const template = createDefaultLayout(type, primaryFunctionId, primaryDescriptor);
  const nextLayout = { ...layout };

  if (type === 'list') {
    if (!nextLayout.listFunction) nextLayout.listFunction = template.listFunction;
    if (!Array.isArray(nextLayout.columns) || nextLayout.columns.length === 0) {
      nextLayout.columns = template.columns;
    }
  } else if (type === 'form') {
    if (!nextLayout.submitFunction) nextLayout.submitFunction = template.submitFunction;
    if (!Array.isArray(nextLayout.fields) || nextLayout.fields.length === 0) {
      nextLayout.fields = template.fields;
    }
  } else if (type === 'detail') {
    if (!nextLayout.detailFunction) nextLayout.detailFunction = template.detailFunction;
    if (!Array.isArray(nextLayout.sections) || nextLayout.sections.length === 0) {
      nextLayout.sections = template.sections;
    }
  } else if (type === 'form-detail') {
    if (!nextLayout.queryFunction) nextLayout.queryFunction = template.queryFunction;
    if (!Array.isArray(nextLayout.queryFields) || nextLayout.queryFields.length === 0) {
      nextLayout.queryFields = template.queryFields;
    }
    if (!Array.isArray(nextLayout.detailSections) || nextLayout.detailSections.length === 0) {
      nextLayout.detailSections = template.detailSections;
    }
  } else if (type === 'kanban') {
    if (!nextLayout.dataFunction) nextLayout.dataFunction = template.dataFunction;
    if (!Array.isArray(nextLayout.columns) || nextLayout.columns.length === 0) {
      nextLayout.columns = template.columns;
    }
  } else if (type === 'timeline') {
    if (!nextLayout.dataFunction) nextLayout.dataFunction = template.dataFunction;
    if (typeof nextLayout.showFilter !== 'boolean') nextLayout.showFilter = true;
    if (typeof nextLayout.reverse !== 'boolean') nextLayout.reverse = true;
  } else if (type === 'split') {
    if (!Array.isArray(nextLayout.panels) || nextLayout.panels.length === 0) {
      nextLayout.panels = template.panels;
    } else {
      nextLayout.panels = nextLayout.panels.map((panel: any, index: number) => {
        const templatePanel = template.panels?.[index] || {};
        const templateComp = templatePanel.component || {};
        const panelComp = panel?.component || {};
        const panelCfg = panelComp.config || {};
        const templateCfg = templateComp.config || {};
        const cfg = { ...panelCfg };
        if (!cfg.listFunction && templateCfg.listFunction) cfg.listFunction = templateCfg.listFunction;
        if (!cfg.detailFunction && templateCfg.detailFunction) cfg.detailFunction = templateCfg.detailFunction;
        if (!Array.isArray(cfg.columns) || cfg.columns.length === 0) cfg.columns = templateCfg.columns || [];
        if (!Array.isArray(cfg.sections) || cfg.sections.length === 0) cfg.sections = templateCfg.sections || [];
        return {
          ...panel,
          component: {
            ...panelComp,
            type: panelComp.type || templateComp.type,
            config: cfg,
          },
        };
      });
    }
    if (!nextLayout.direction) nextLayout.direction = 'horizontal';
  } else if (type === 'wizard') {
    if (!Array.isArray(nextLayout.steps) || nextLayout.steps.length === 0) {
      nextLayout.steps = template.steps;
    } else {
      nextLayout.steps = nextLayout.steps.map((step: any, index: number) => {
        const templateStep = template.steps?.[index] || {};
        const templateComp = templateStep.component || {};
        const stepComp = step?.component || {};
        const stepCfg = stepComp.config || {};
        const templateCfg = templateComp.config || {};
        const cfg = { ...stepCfg };
        if (!cfg.submitFunction && templateCfg.submitFunction) cfg.submitFunction = templateCfg.submitFunction;
        if (!cfg.detailFunction && templateCfg.detailFunction) cfg.detailFunction = templateCfg.detailFunction;
        if (!Array.isArray(cfg.fields) || cfg.fields.length === 0) cfg.fields = templateCfg.fields || [];
        if (!Array.isArray(cfg.sections) || cfg.sections.length === 0) cfg.sections = templateCfg.sections || [];
        return {
          ...step,
          component: {
            ...stepComp,
            type: stepComp.type || templateComp.type,
            config: cfg,
          },
        };
      });
    }
  } else if (type === 'dashboard') {
    if (!Array.isArray(nextLayout.stats) || nextLayout.stats.length === 0) {
      nextLayout.stats = template.stats;
    }
    if (!Array.isArray(nextLayout.panels) || nextLayout.panels.length === 0) {
      nextLayout.panels = template.panels;
    } else {
      nextLayout.panels = nextLayout.panels.map((panel: any, index: number) => {
        const templatePanel = template.panels?.[index] || {};
        const templateComp = templatePanel.component || {};
        const panelComp = panel?.component || {};
        const panelCfg = panelComp.config || {};
        const templateCfg = templateComp.config || {};
        const cfg = { ...panelCfg };
        if (!cfg.listFunction && templateCfg.listFunction) cfg.listFunction = templateCfg.listFunction;
        if (!cfg.detailFunction && templateCfg.detailFunction) cfg.detailFunction = templateCfg.detailFunction;
        if (!Array.isArray(cfg.columns) || cfg.columns.length === 0) cfg.columns = templateCfg.columns || [];
        if (!Array.isArray(cfg.sections) || cfg.sections.length === 0) cfg.sections = templateCfg.sections || [];
        return {
          ...panel,
          component: {
            ...panelComp,
            type: panelComp.type || templateComp.type,
            config: cfg,
          },
        };
      });
    }
  } else if (type === 'grid') {
    if (!nextLayout.columns) nextLayout.columns = template.columns;
    if (!Array.isArray(nextLayout.items) || nextLayout.items.length === 0) {
      nextLayout.items = template.items;
    } else {
      nextLayout.items = nextLayout.items.map((item: any, index: number) => {
        const templateItem = template.items?.[index] || {};
        const templateComp = templateItem.component || {};
        const itemComp = item?.component || {};
        const itemCfg = itemComp.config || {};
        const templateCfg = templateComp.config || {};
        const cfg = { ...itemCfg };
        if (!cfg.listFunction && templateCfg.listFunction) cfg.listFunction = templateCfg.listFunction;
        if (!cfg.detailFunction && templateCfg.detailFunction) cfg.detailFunction = templateCfg.detailFunction;
        if (!Array.isArray(cfg.columns) || cfg.columns.length === 0) cfg.columns = templateCfg.columns || [];
        if (!Array.isArray(cfg.sections) || cfg.sections.length === 0) cfg.sections = templateCfg.sections || [];
        return {
          ...item,
          component: {
            ...itemComp,
            type: itemComp.type || templateComp.type,
            config: cfg,
          },
        };
      });
    }
    if (!Array.isArray(nextLayout.gutter) || nextLayout.gutter.length !== 2) {
      nextLayout.gutter = template.gutter;
    }
  } else if (type === 'custom') {
    if (!nextLayout.component) nextLayout.component = template.component;
    if (!nextLayout.props || typeof nextLayout.props !== 'object') nextLayout.props = {};
  }

  return {
    ...tab,
    layout: nextLayout,
  };
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
    case 'kanban':
      return renderKanbanConfig(layout, tab, onTabChange, descriptors);
    case 'timeline':
      return renderTimelineConfig(layout, tab, onTabChange, descriptors);
    case 'split':
      return renderSplitConfig(layout, tab, onTabChange, descriptors);
    case 'wizard':
      return renderWizardConfig(layout, tab, onTabChange);
    case 'dashboard':
      return renderDashboardConfig(layout, tab, onTabChange);
    case 'grid':
      return renderGridConfig(layout, tab, onTabChange);
    case 'custom':
      return renderCustomConfig(layout, tab, onTabChange);
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
              onChange({ ...tab, layout: nextLayout });
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
            onChange={(v) => {
              const nextLayout: any = { ...layout, queryFunction: v };
              const missingQueryFields =
                !Array.isArray(nextLayout.queryFields) || nextLayout.queryFields.length === 0;
              const missingSections =
                !Array.isArray(nextLayout.detailSections) || nextLayout.detailSections.length === 0;
              if (v && (missingQueryFields || missingSections)) {
                const desc = descriptors.find((d) => d.id === v);
                if (desc) {
                  if (missingQueryFields) {
                    nextLayout.queryFields = schemaToFields(desc);
                  }
                  if (missingSections) {
                    nextLayout.detailSections = schemaToDetailSections(desc);
                  }
                }
              }
              onChange({ ...tab, layout: nextLayout });
            }}
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
            onChange={(v) => {
              const nextLayout: any = { ...layout, submitFunction: v };
              const missingFields =
                !Array.isArray(nextLayout.fields) || nextLayout.fields.length === 0;
              if (v && missingFields) {
                const desc = descriptors.find((d) => d.id === v);
                if (desc) {
                  nextLayout.fields = schemaToFields(desc);
                }
              }
              onChange({ ...tab, layout: nextLayout });
            }}
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
          onChange={(v) => {
            const nextLayout: any = { ...layout, detailFunction: v };
            const missingSections =
              !Array.isArray(nextLayout.sections) || nextLayout.sections.length === 0;
            if (v && missingSections) {
              const desc = descriptors.find((d) => d.id === v);
              if (desc) {
                nextLayout.sections = schemaToDetailSections(desc);
              }
            }
            onChange({ ...tab, layout: nextLayout });
          }}
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

function renderKanbanConfig(
  layout: any,
  tab: TabConfig,
  onChange: (tab: TabConfig) => void,
  descriptors: FunctionDescriptor[],
): React.ReactNode {
  const cols = Array.isArray(layout.columns) ? layout.columns : [];
  return (
    <Form layout="vertical">
      <Form.Item label="数据函数">
        <Select
          value={layout.dataFunction}
          onChange={(v) => onChange({ ...tab, layout: { ...layout, dataFunction: v } })}
          allowClear
          showSearch
          placeholder="选择数据函数"
        >
          {tab.functions.map((fid) => {
            const d = descriptors.find((x) => x.id === fid);
            return (
              <Select.Option key={fid} value={fid}>
                {d?.display_name?.zh || d?.display_name?.en || fid}
              </Select.Option>
            );
          })}
        </Select>
      </Form.Item>
      <Form.Item label="看板列(JSON)">
        <Input.TextArea
          rows={8}
          value={JSON.stringify(cols, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              if (Array.isArray(parsed)) {
                onChange({ ...tab, layout: { ...layout, columns: parsed } });
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

function renderTimelineConfig(
  layout: any,
  tab: TabConfig,
  onChange: (tab: TabConfig) => void,
  descriptors: FunctionDescriptor[],
): React.ReactNode {
  return (
    <Form layout="vertical">
      <Form.Item label="数据函数">
        <Select
          value={layout.dataFunction}
          onChange={(v) => onChange({ ...tab, layout: { ...layout, dataFunction: v } })}
          allowClear
          showSearch
          placeholder="选择数据函数"
        >
          {tab.functions.map((fid) => {
            const d = descriptors.find((x) => x.id === fid);
            return (
              <Select.Option key={fid} value={fid}>
                {d?.display_name?.zh || d?.display_name?.en || fid}
              </Select.Option>
            );
          })}
        </Select>
      </Form.Item>
      <Form.Item label="显示筛选">
        <Switch
          checked={Boolean(layout.showFilter)}
          onChange={(checked) => onChange({ ...tab, layout: { ...layout, showFilter: checked } })}
        />
      </Form.Item>
      <Form.Item label="逆序显示">
        <Switch
          checked={Boolean(layout.reverse)}
          onChange={(checked) => onChange({ ...tab, layout: { ...layout, reverse: checked } })}
        />
      </Form.Item>
    </Form>
  );
}

function renderSplitConfig(
  layout: any,
  tab: TabConfig,
  onChange: (tab: TabConfig) => void,
  descriptors: FunctionDescriptor[],
): React.ReactNode {
  const panels = Array.isArray(layout.panels) ? layout.panels : [];
  const primary = tab.functions[0] || '';
  const secondary = tab.functions[1] || primary;

  const applyMasterDetail = () => {
    onChange({
      ...tab,
      layout: {
        type: 'split',
        direction: 'horizontal',
        panels: [
          {
            key: 'left',
            title: '主列表',
            span: 12,
            component: {
              type: 'list',
              config: {
                listFunction: primary,
                columns: [
                  { key: 'id', title: 'ID' },
                  { key: 'name', title: '名称' },
                  { key: 'status', title: '状态' },
                ],
              },
            },
          },
          {
            key: 'right',
            title: '详情',
            span: 12,
            component: {
              type: 'detail',
              config: {
                detailFunction: secondary,
                sections: [
                  {
                    title: '基础信息',
                    fields: [
                      { key: 'id', label: 'ID' },
                      { key: 'name', label: '名称' },
                      { key: 'status', label: '状态' },
                    ],
                  },
                ],
              },
            },
          },
        ],
      },
    });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Button icon={<ThunderboltOutlined />} onClick={applyMasterDetail}>
        应用主从预设
      </Button>
      <div style={{ color: '#999', fontSize: 12 }}>
        预设函数: {descriptors.find((d) => d.id === primary)?.display_name?.zh || primary || '-'} /{' '}
        {descriptors.find((d) => d.id === secondary)?.display_name?.zh || secondary || '-'}
      </div>
      <Form layout="vertical">
        <Form.Item label="分栏方向">
          <Select
            value={layout.direction || 'horizontal'}
            onChange={(v) => onChange({ ...tab, layout: { ...layout, direction: v } })}
          >
            <Select.Option value="horizontal">水平</Select.Option>
            <Select.Option value="vertical">垂直</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="面板配置(JSON)">
          <Input.TextArea
            rows={10}
            value={JSON.stringify(panels, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                if (Array.isArray(parsed)) {
                  onChange({ ...tab, layout: { ...layout, panels: parsed } });
                }
              } catch {
                // ignore invalid json while editing
              }
            }}
          />
        </Form.Item>
      </Form>
    </Space>
  );
}

function renderWizardConfig(layout: any, tab: TabConfig, onChange: (tab: TabConfig) => void): React.ReactNode {
  const steps = Array.isArray(layout.steps) ? layout.steps : [];
  return (
    <Form layout="vertical">
      <Form.Item label="步骤配置(JSON)">
        <Input.TextArea
          rows={10}
          value={JSON.stringify(steps, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              if (Array.isArray(parsed)) {
                onChange({ ...tab, layout: { ...layout, steps: parsed } });
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

function renderDashboardConfig(layout: any, tab: TabConfig, onChange: (tab: TabConfig) => void): React.ReactNode {
  const stats = Array.isArray(layout.stats) ? layout.stats : [];
  const panels = Array.isArray(layout.panels) ? layout.panels : [];
  return (
    <Form layout="vertical">
      <Form.Item label="指标卡配置(JSON)">
        <Input.TextArea
          rows={6}
          value={JSON.stringify(stats, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              if (Array.isArray(parsed)) {
                onChange({ ...tab, layout: { ...layout, stats: parsed } });
              }
            } catch {
              // ignore invalid json while editing
            }
          }}
        />
      </Form.Item>
      <Form.Item label="面板配置(JSON)">
        <Input.TextArea
          rows={8}
          value={JSON.stringify(panels, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              if (Array.isArray(parsed)) {
                onChange({ ...tab, layout: { ...layout, panels: parsed } });
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

function renderGridConfig(layout: any, tab: TabConfig, onChange: (tab: TabConfig) => void): React.ReactNode {
  const items = Array.isArray(layout.items) ? layout.items : [];
  return (
    <Form layout="vertical">
      <Form.Item label="列数">
        <Input
          type="number"
          value={layout.columns || 2}
          onChange={(e) =>
            onChange({ ...tab, layout: { ...layout, columns: Number(e.target.value || 2) } })
          }
        />
      </Form.Item>
      <Form.Item label="网格项(JSON)">
        <Input.TextArea
          rows={10}
          value={JSON.stringify(items, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              if (Array.isArray(parsed)) {
                onChange({ ...tab, layout: { ...layout, items: parsed } });
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

function renderCustomConfig(layout: any, tab: TabConfig, onChange: (tab: TabConfig) => void): React.ReactNode {
  return (
    <Form layout="vertical">
      <Form.Item label="组件名称">
        <Input
          value={layout.component || ''}
          onChange={(e) => onChange({ ...tab, layout: { ...layout, component: e.target.value } })}
          placeholder="例如: CustomPanel"
        />
      </Form.Item>
      <Form.Item label="组件参数(JSON)">
        <Input.TextArea
          rows={8}
          value={JSON.stringify(layout.props || {}, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange({ ...tab, layout: { ...layout, props: parsed } });
            } catch {
              // ignore invalid json while editing
            }
          }}
        />
      </Form.Item>
    </Form>
  );
}
