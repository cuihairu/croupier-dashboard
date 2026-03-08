import React from 'react';
import { Alert, Card, Col, Row, Statistic } from 'antd';
import type { RendererProps } from './types';
import ListRenderer from './ListRenderer';
import FormRenderer from './FormRenderer';
import DetailRenderer from './DetailRenderer';
import FormDetailRenderer from './FormDetailRenderer';
import {
  buildGamePreviewDashboardStats,
  buildPreviewDetailConfig,
  buildPreviewListConfig,
} from './mockData';

type DashboardPanel = {
  key: string;
  title?: string;
  span?: number;
  component?: {
    type: 'list' | 'form' | 'detail' | 'form-detail';
    config: Record<string, any>;
  };
};

type DashboardStat = {
  key: string;
  title: string;
  value: number | string;
  suffix?: string;
};

type DashboardLayout = {
  type: 'dashboard';
  stats?: DashboardStat[];
  panels?: DashboardPanel[];
};

export default function DashboardRenderer({
  layout,
  objectKey,
  context,
}: RendererProps<DashboardLayout>) {
  const isTemplatePreview = Boolean((context as any)?.templatePreview);
  const stats = Array.isArray(layout?.stats) && layout.stats.length > 0
    ? layout.stats
    : isTemplatePreview
    ? buildGamePreviewDashboardStats()
    : [];
  const panels = Array.isArray(layout?.panels) && layout.panels.length > 0
    ? layout.panels
    : isTemplatePreview
    ? [
        {
          key: 'p1',
          title: '示例列表',
          span: 12,
          component: { type: 'list', config: buildPreviewListConfig('') },
        },
        {
          key: 'p2',
          title: '示例详情',
          span: 12,
          component: { type: 'detail', config: buildPreviewDetailConfig('') },
        },
      ]
    : [];

  if (stats.length === 0 && panels.length === 0) {
    return <Alert type="warning" showIcon message="dashboard 布局缺少 stats/panels 配置" />;
  }

  return (
    <Row gutter={[16, 16]}>
      {stats.map((s) => (
        <Col key={s.key} span={6}>
          <Card>
            <Statistic title={s.title} value={s.value} suffix={s.suffix} />
          </Card>
        </Col>
      ))}

      {panels.map((p) => (
        <Col key={p.key} span={p.span || 12}>
          <Card title={p.title}>{renderPanel(p, objectKey, context)}</Card>
        </Col>
      ))}
    </Row>
  );
}

function renderPanel(panel: DashboardPanel, objectKey: string, context?: Record<string, any>) {
  const comp = panel.component;
  if (!comp) {
    return <Alert type="info" showIcon message={`面板 ${panel.key} 未配置 component`} />;
  }
  switch (comp.type) {
    case 'list':
      return <ListRenderer layout={{ type: 'list', ...(comp.config || {}) } as any} objectKey={objectKey} context={context} />;
    case 'form':
      return <FormRenderer layout={{ type: 'form', ...(comp.config || {}) } as any} objectKey={objectKey} context={context} />;
    case 'detail':
      return <DetailRenderer layout={{ type: 'detail', ...(comp.config || {}) } as any} objectKey={objectKey} context={context} />;
    case 'form-detail':
      return (
        <FormDetailRenderer
          layout={{ type: 'form-detail', ...(comp.config || {}) } as any}
          objectKey={objectKey}
          context={context}
        />
      );
    default:
      return <Alert type="error" showIcon message={`不支持的 dashboard 组件类型: ${(comp as any).type}`} />;
  }
}
