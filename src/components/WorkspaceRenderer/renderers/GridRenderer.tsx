import React from 'react';
import { Alert, Col, Empty, Row } from 'antd';
import type { RendererProps } from './types';
import ListRenderer from './ListRenderer';
import FormRenderer from './FormRenderer';
import DetailRenderer from './DetailRenderer';
import FormDetailRenderer from './FormDetailRenderer';
import { buildPreviewDetailConfig, buildPreviewListConfig } from './mockData';

type GridItem = {
  key: string;
  colSpan?: number;
  visible?: boolean;
  component?: {
    type: 'list' | 'form' | 'detail' | 'form-detail' | 'custom';
    config: Record<string, any>;
  };
};

type GridLayout = {
  type: 'grid';
  columns?: number;
  gutter?: number | [number, number];
  items: GridItem[];
};

export default function GridRenderer({ layout, objectKey, context }: RendererProps<GridLayout>) {
  const isTemplatePreview = Boolean((context as any)?.templatePreview);
  const columns = layout?.columns || 3;
  const gutter = layout?.gutter || [16, 16];
  const items =
    Array.isArray(layout?.items) && layout.items.length > 0
      ? layout.items
      : isTemplatePreview
      ? [
          { key: 'g-list', component: { type: 'list', config: buildPreviewListConfig('') } },
          { key: 'g-detail', component: { type: 'detail', config: buildPreviewDetailConfig('') } },
        ]
      : [];

  if (items.length === 0) {
    return <Empty description="暂无网格内容" />;
  }

  return (
    <Row gutter={gutter as any}>
      {items
        .filter((item) => item.visible !== false)
        .map((item) => (
          <Col
            key={item.key}
            span={Math.max(1, Math.min(24, Math.floor((24 / columns) * (item.colSpan || 1))))}
          >
            {renderGridItem(item, objectKey, context)}
          </Col>
        ))}
    </Row>
  );
}

function renderGridItem(item: GridItem, objectKey: string, context?: Record<string, any>) {
  const comp = item.component;
  if (!comp) {
    return <Alert type="info" showIcon message={`网格项 ${item.key} 未配置 component`} />;
  }
  switch (comp.type) {
    case 'list':
      return (
        <ListRenderer
          layout={{ type: 'list', ...(comp.config || {}) } as any}
          objectKey={objectKey}
          context={context}
        />
      );
    case 'form':
      return (
        <FormRenderer
          layout={{ type: 'form', ...(comp.config || {}) } as any}
          objectKey={objectKey}
          context={context}
        />
      );
    case 'detail':
      return (
        <DetailRenderer
          layout={{ type: 'detail', ...(comp.config || {}) } as any}
          objectKey={objectKey}
          context={context}
        />
      );
    case 'form-detail':
      return (
        <FormDetailRenderer
          layout={{ type: 'form-detail', ...(comp.config || {}) } as any}
          objectKey={objectKey}
          context={context}
        />
      );
    case 'custom':
      return (
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(comp.config || {}, null, 2)}</pre>
      );
    default:
      return (
        <Alert type="error" showIcon message={`不支持的 grid 组件类型: ${(comp as any).type}`} />
      );
  }
}
