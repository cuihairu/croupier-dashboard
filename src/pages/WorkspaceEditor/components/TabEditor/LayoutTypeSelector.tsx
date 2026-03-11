import React from 'react';
import { Card, Select, Space, Button, Tooltip, Tag, Dropdown, Menu, message } from 'antd';
import { ThunderboltOutlined, AppstoreOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import type { FunctionDescriptor } from '@/services/api/functions';
import { HelpTooltip, HelpModal } from '../HelpTooltip';

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

/** 预置布局模板库 */
const LAYOUT_TEMPLATES: Array<{
  id: string;
  label: string;
  description: string;
  layout: any;
}> = [
  {
    id: 'tpl_list_basic',
    label: '基础列表',
    description: '带分页的数据列表，含 ID、名称、状态、操作时间列',
    layout: {
      type: 'list',
      listFunction: '',
      columns: [
        { key: 'id', title: 'ID', width: 80, sortable: true },
        { key: 'name', title: '名称', ellipsis: true },
        { key: 'status', title: '状态', render: 'status', width: 100 },
        { key: 'updated_at', title: '更新时间', render: 'datetime', width: 180, sortable: true },
      ],
    },
  },
  {
    id: 'tpl_form_create',
    label: '创建表单',
    description: '基础创建表单，含名称、描述、状态字段',
    layout: {
      type: 'form',
      submitFunction: '',
      fields: [
        { key: 'name', label: '名称', type: 'input', required: true, placeholder: '请输入名称' },
        { key: 'description', label: '描述', type: 'textarea', placeholder: '请输入描述' },
        {
          key: 'status',
          label: '状态',
          type: 'select',
          options: [
            { label: '启用', value: 'active' },
            { label: '禁用', value: 'inactive' },
          ],
        },
      ],
    },
  },
  {
    id: 'tpl_detail_readonly',
    label: '只读详情',
    description: '只读详情页，含基本信息和扩展信息分区',
    layout: {
      type: 'detail',
      detailFunction: '',
      sections: [
        { title: '基本信息', fields: ['id', 'name', 'status'] },
        { title: '扩展信息', fields: ['created_at', 'updated_at', 'description'] },
      ],
    },
  },
  {
    id: 'tpl_form_detail_query',
    label: '查询-详情',
    description: '先查询再展示详情，适合按 ID 或条件查询单条记录',
    layout: {
      type: 'form-detail',
      queryFunction: '',
      queryFields: [
        { key: 'id', label: 'ID', type: 'input', required: true, placeholder: '请输入查询 ID' },
      ],
    },
  },
  {
    id: 'tpl_list_crud',
    label: 'CRUD 列表',
    description: '完整增删改查列表，含搜索、新增、编辑、删除操作',
    layout: {
      type: 'list',
      listFunction: '',
      columns: [
        { key: 'id', title: 'ID', width: 80, fixed: 'left', sortable: true },
        { key: 'name', title: '名称', ellipsis: true },
        { key: 'type', title: '类型', width: 100 },
        { key: 'status', title: '状态', render: 'status', width: 100 },
        { key: 'created_at', title: '创建时间', render: 'datetime', width: 180 },
        { key: 'updated_at', title: '更新时间', render: 'datetime', width: 180, sortable: true },
      ],
    },
  },
];

const TAB_SCENARIO_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'player_list_ops', label: '玩家运营列表' },
  { value: 'player_detail_profile', label: '玩家详情档案' },
  { value: 'ops_kanban_flow', label: '运营看板流程' },
  { value: 'activity_wizard', label: '活动配置向导' },
];

type ScenarioId =
  | 'player_list_ops'
  | 'player_detail_profile'
  | 'ops_kanban_flow'
  | 'activity_wizard';

type ScenarioRecommendation = {
  id: ScenarioId;
  confidence: number;
  reasons: string[];
};

export interface LayoutTypeSelectorProps {
  layoutType: string;
  functions: string[];
  descriptors: FunctionDescriptor[];
  recommendedScenario: ScenarioRecommendation | null;
  undoStackLength: number;
  redoStackLength: number;
  onLayoutTypeChange: (type: string) => void;
  onApplyScenario: (scenarioId: string) => void;
  onApplyLayout?: (layout: any) => void;
  onAutoLayout: () => void;
  onHealLayout: () => void;
  onOpenOrchestrator: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

function getScenarioLabel(id: string): string {
  return TAB_SCENARIO_OPTIONS.find((x) => x.value === id)?.label || id;
}

export default function LayoutTypeSelector({
  layoutType,
  functions,
  descriptors,
  recommendedScenario,
  undoStackLength,
  redoStackLength,
  onLayoutTypeChange,
  onApplyScenario,
  onApplyLayout,
  onAutoLayout,
  onHealLayout,
  onOpenOrchestrator,
  onUndo,
  onRedo,
}: LayoutTypeSelectorProps) {
  const [helpModalVisible, setHelpModalVisible] = React.useState(false);

  return (
    <>
      <Card
        title="布局类型"
        size="small"
        extra={
          <Space>
            {recommendedScenario && (
              <>
                <Tooltip title={recommendedScenario.reasons.join('；')}>
                  <Tag color="gold">
                    推荐: {getScenarioLabel(recommendedScenario.id)} (
                    {recommendedScenario.confidence}
                    %)
                  </Tag>
                </Tooltip>
                <Button size="small" onClick={() => onApplyScenario(recommendedScenario.id)}>
                  应用推荐
                </Button>
              </>
            )}
            <Select
              size="small"
              placeholder="场景模板"
              style={{ width: 180 }}
              onChange={onApplyScenario}
              options={TAB_SCENARIO_OPTIONS}
              allowClear
            />
            <Dropdown
              trigger={['click']}
              overlay={
                <Menu>
                  {LAYOUT_TEMPLATES.map((tpl) => (
                    <Menu.Item
                      key={tpl.id}
                      onClick={() => {
                        if (onApplyLayout) {
                          onApplyLayout(tpl.layout);
                        } else {
                          onLayoutTypeChange(tpl.layout.type);
                        }
                        message.success(`已应用布局模板：${tpl.label}`);
                      }}
                    >
                      <div>
                        <strong>{tpl.label}</strong>
                        <div style={{ fontSize: 11, color: '#999' }}>{tpl.description}</div>
                      </div>
                    </Menu.Item>
                  ))}
                </Menu>
              }
            >
              <Button size="small" icon={<AppstoreOutlined />}>
                布局模板
              </Button>
            </Dropdown>
            <Button
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={onHealLayout}
              title="补全当前布局缺失配置"
            >
              一键补全
            </Button>
            <Button
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={onAutoLayout}
              title="根据第一个函数自动推导布局"
            >
              自动推导
            </Button>
            <Button size="small" onClick={onOpenOrchestrator}>
              编排向导
            </Button>
            <Button
              size="small"
              disabled={undoStackLength === 0}
              onClick={onUndo}
              title="Ctrl/Cmd + Alt + Z"
            >
              撤销编排
            </Button>
            <Button
              size="small"
              disabled={redoStackLength === 0}
              onClick={onRedo}
              title="Ctrl/Cmd + Alt + Y"
            >
              重做编排
            </Button>
          </Space>
        }
      >
        <Select value={layoutType} onChange={onLayoutTypeChange} style={{ width: '100%' }}>
          {LAYOUT_OPTIONS.map((opt) => (
            <Select.Option key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Option>
          ))}
        </Select>
      </Card>
      <HelpModal visible={helpModalVisible} onClose={() => setHelpModalVisible(false)} />
    </>
  );
}
