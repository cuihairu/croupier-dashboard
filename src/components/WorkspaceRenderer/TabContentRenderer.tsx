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

    default:
      return (
        <Alert
          message="当前 Tab 布局不在 V1 支持范围"
          description={`仅支持 form-detail/list/form/detail，当前类型: ${(layout as any).type}`}
          type="error"
          showIcon
          style={{ margin: '20px' }}
        />
      );
  }
}
