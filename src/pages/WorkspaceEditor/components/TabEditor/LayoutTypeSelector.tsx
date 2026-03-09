import React from 'react';
import { Card, Select, Space, Button, Tooltip, Tag } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import type { FunctionDescriptor } from '@/services/api/functions';

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
  onAutoLayout,
  onHealLayout,
  onOpenOrchestrator,
  onUndo,
  onRedo,
}: LayoutTypeSelectorProps) {
  return (
    <Card
      title="布局类型"
      size="small"
      extra={
        <Space>
          {recommendedScenario && (
            <>
              <Tooltip title={recommendedScenario.reasons.join('；')}>
                <Tag color="gold">
                  推荐: {getScenarioLabel(recommendedScenario.id)} ({recommendedScenario.confidence}
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
  );
}
