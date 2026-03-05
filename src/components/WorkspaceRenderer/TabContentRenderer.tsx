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
      return renderFormDetailLayout(layout, tab, objectKey, context);

    case 'list':
      return renderListLayout(layout, tab, objectKey, context);

    case 'form':
      return renderFormLayout(layout, tab, objectKey, context);

    case 'detail':
      return renderDetailLayout(layout, tab, objectKey, context);

    case 'custom':
      return renderCustomLayout(layout, tab, objectKey, context);

    default:
      return (
        <Alert
          message="未知布局类型"
          description={`不支持的布局类型: ${(layout as any).type}`}
          type="error"
          showIcon
          style={{ margin: '20px' }}
        />
      );
  }
}

/**
 * 渲染表单-详情布局
 */
function renderFormDetailLayout(
  layout: any,
  tab: TabConfig,
  objectKey: string,
  context?: Record<string, any>,
): React.ReactNode {
  // TODO: 实现 FormDetailRenderer
  return (
    <Alert
      message="开发中"
      description="FormDetail 布局渲染器将在 Week 2 实现"
      type="info"
      showIcon
      style={{ margin: '20px' }}
    />
  );
}

/**
 * 渲染列表布局
 */
function renderListLayout(
  layout: any,
  tab: TabConfig,
  objectKey: string,
  context?: Record<string, any>,
): React.ReactNode {
  // TODO: 实现 ListRenderer
  return (
    <Alert
      message="开发中"
      description="List 布局渲染器将在 Week 2 实现"
      type="info"
      showIcon
      style={{ margin: '20px' }}
    />
  );
}

/**
 * 渲染表单布局
 */
function renderFormLayout(
  layout: any,
  tab: TabConfig,
  objectKey: string,
  context?: Record<string, any>,
): React.ReactNode {
  // TODO: 实现 FormRenderer
  return (
    <Alert
      message="开发中"
      description="Form 布局渲染器将在 Week 2 实现"
      type="info"
      showIcon
      style={{ margin: '20px' }}
    />
  );
}

/**
 * 渲染详情布局
 */
function renderDetailLayout(
  layout: any,
  tab: TabConfig,
  objectKey: string,
  context?: Record<string, any>,
): React.ReactNode {
  // TODO: 实现 DetailRenderer
  return (
    <Alert
      message="开发中"
      description="Detail 布局渲染器将在 Week 2 实现"
      type="info"
      showIcon
      style={{ margin: '20px' }}
    />
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
