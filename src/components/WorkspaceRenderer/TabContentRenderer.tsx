/**
 * Tab 内容渲染器
 *
 * 根据 Tab 的布局类型渲染对应的内容。
 *
 * @module components/WorkspaceRenderer/TabContentRenderer
 */

import React from 'react';
import { Alert } from 'antd';
import type { TabConfig } from '@/types/workspace';
import FormDetailRenderer from './renderers/FormDetailRenderer';
import ListRenderer from './renderers/ListRenderer';
import FormRenderer from './renderers/FormRenderer';
import DetailRenderer from './renderers/DetailRenderer';
import GridRenderer from './renderers/GridRenderer';
import KanbanRenderer from './renderers/KanbanRenderer';
import TimelineRenderer from './renderers/TimelineRenderer';

export interface TabContentRendererProps {
  /** Tab 配置 */
  tab: TabConfig;

  /** 对象标识 */
  objectKey: string;

  /** 额外的上下文数据 */
  context?: Record<string, any>;
}

/**
 * Tab 内容渲染器组件
 *
 * 根据 Tab 的布局类型分发到不同的渲染器。
 */
export default function TabContentRenderer({ tab, objectKey, context }: TabContentRendererProps) {
  const { layout } = tab;

  // 根据布局类型渲染
  switch (layout.type) {
    case 'form-detail':
      return <FormDetailRenderer layout={layout} objectKey={objectKey} context={context} />;

    case 'list':
      return <ListRenderer layout={layout} objectKey={objectKey} context={context} />;

    case 'form':
      return <FormRenderer layout={layout} objectKey={objectKey} context={context} />;

    case 'detail':
      return <DetailRenderer layout={layout} objectKey={objectKey} context={context} />;

    case 'grid':
      return <GridRenderer config={{ layout }} context={context} />;

    case 'kanban':
      return <KanbanRenderer config={{ layout }} context={context} />;

    case 'timeline':
      return <TimelineRenderer config={{ layout }} context={context} />;

    case 'split':
      return <SplitRenderer layout={layout} objectKey={objectKey} context={context} />;

    case 'custom':
      return renderCustomLayout(layout, tab, objectKey, context);

    default:
      return (
        <Alert
          message="未知布局类型"
          description={`不支持的布局类型: ${(layout as any).type}`}
          type="info"
          showIcon
          style={{ margin: '20px' }}
        />
      );
  }
}

/**
 * 分栏布局渲染器
 */
function SplitRenderer({
  layout,
  objectKey,
  context,
}: {
  layout: any;
  objectKey: string;
  context?: Record<string, any>;
}) {
  const { direction = 'horizontal', panels = [], sizes = [] } = layout;

  if (!panels || panels.length === 0) {
    return <Alert message="分栏布局" description="请配置分栏面板" type="info" showIcon />;
  }

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction === 'vertical' ? 'column' : 'row',
    height: '100%',
    gap: 16,
  };

  return (
    <div style={containerStyle}>
      {panels.map((panel: any, index: number) => {
        const size = sizes[index] || `${100 / panels.length}%`;
        const panelStyle: React.CSSProperties = {
          flex: direction === 'vertical' ? `0 0 ${size}` : `0 0 ${size}`,
          overflow: 'auto',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: 16,
        };

        return (
          <div key={panel.key || index} style={panelStyle}>
            {panel.title && <h4 style={{ marginBottom: 12 }}>{panel.title}</h4>}
            {panel.content || (
              <Alert
                message={`面板 ${index + 1}`}
                description="请配置面板内容"
                type="info"
                showIcon
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * 渲染自定义布局
 */
function renderCustomLayout(
  layout: any,
  tab: TabConfig,
  objectKey: string,
  context?: Record<string, any>,
): React.ReactNode {
  return (
    <Alert
      message="自定义布局"
      description={`自定义组件: ${layout.component}`}
      type="warning"
      showIcon
      style={{ margin: '20px' }}
    />
  );
}
