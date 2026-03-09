import type { FunctionDescriptor } from '@/services/api/functions';
import {
  schemaToColumns,
  schemaToDetailSections,
  schemaToFields,
} from '../../utils/schemaToLayout';

type ScenarioId =
  | 'player_list_ops'
  | 'player_detail_profile'
  | 'ops_kanban_flow'
  | 'activity_wizard';

export type ScenarioRecommendation = {
  id: ScenarioId;
  confidence: number;
  reasons: string[];
};

const TAB_SCENARIO_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'player_list_ops', label: '玩家运营列表' },
  { value: 'player_detail_profile', label: '玩家详情档案' },
  { value: 'ops_kanban_flow', label: '运营看板流程' },
  { value: 'activity_wizard', label: '活动配置向导' },
];

export function getScenarioLabel(id: string): string {
  return TAB_SCENARIO_OPTIONS.find((x) => x.value === id)?.label || id;
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

export function detectRecommendedScenario(
  descriptors: FunctionDescriptor[],
): ScenarioRecommendation {
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
    const summaryText = `${descriptor.summary?.zh || ''} ${
      descriptor.summary?.en || ''
    }`.toLowerCase();
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
    if (
      hitAny(['detail', 'profile', 'info', 'get', 'query']) &&
      !hitAny(['list', 'page', 'search'])
    ) {
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

export function createScenarioLayout(scenarioId: string, primaryFunctionId: string): any | null {
  switch (scenarioId) {
    case 'player_list_ops':
      return {
        type: 'list',
        listFunction: primaryFunctionId || '',
        columns: [
          { key: 'playerId', title: '玩家ID' },
          { key: 'nickname', title: '昵称' },
          { key: 'level', title: '等级' },
          { key: 'vip', title: 'VIP' },
          { key: 'serverId', title: '服务器' },
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
