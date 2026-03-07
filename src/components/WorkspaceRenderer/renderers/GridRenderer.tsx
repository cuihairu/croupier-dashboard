/**
 * 网格布局渲染器
 *
 * 支持响应式网格布局，可配置列数和间距。
 *
 * @module components/WorkspaceRenderer/renderers/GridRenderer
 */

import React from 'react';
import { Row, Col, Card, Empty } from 'antd';
import type { WorkspaceConfig, TabConfig } from '@/types/workspace';
import ListRenderer from './ListRenderer';
import FormRenderer from './FormRenderer';
import DetailRenderer from './DetailRenderer';
import FormDetailRenderer from './FormDetailRenderer';

export interface GridRendererProps {
  config: WorkspaceConfig | TabConfig;
  context?: Record<string, any>;
}

export interface GridLayout {
  type: 'grid';
  columns?: number; // 每行列数
  gutter?: number | [number, number]; // 间距
  items: GridItem[];
  responsive?: boolean; // 是否响应式
}

export interface GridItem {
  key: string;
  colSpan?: number; // 占几列
  rowSpan?: number; // 占几行
  minWidth?: number; // 最小宽度
  maxWidth?: number; // 最大宽度
  visible?: boolean; // 是否可见
  render?: () => React.ReactNode;
  component?: {
    type: 'list' | 'form' | 'detail' | 'form-detail' | 'chart' | 'stat' | 'custom';
    config: Record<string, any>;
  };
}

export default function GridRenderer({ config, context }: GridRendererProps) {
  const layout = (config.layout as any) || {};
  const { columns = 3, gutter = [16, 16], items = [], responsive = true } = layout as GridLayout;

  if (!items || items.length === 0) {
    return <Empty description="暂无内容" />;
  }

  // 计算响应式配置
  const getResponsiveColSpan = (item: GridItem) => {
    if (!responsive) {
      return item.colSpan || 1;
    }

    // 根据屏幕宽度调整
    // 这里简化处理，实际应该使用 antd 的响应式系统
    return {
      xs: 24, // 手机
      sm: 12, // 平板
      md: (24 / columns) * (item.colSpan || 1), // 桌面
      lg: (24 / columns) * (item.colSpan || 1), // 大屏
      xl: (24 / columns) * (item.colSpan || 1), // 超大屏
    };
  };

  // 渲染网格项内容
  const renderItemContent = (item: GridItem) => {
    if (item.render) {
      return item.render();
    }

    if (item.component) {
      switch (item.component.type) {
        case 'list':
          return (
            <ListRenderer
              config={
                {
                  layout: { type: 'list', ...item.component.config },
                } as any
              }
              context={context}
            />
          );
        case 'form':
          return (
            <FormRenderer
              config={
                {
                  layout: { type: 'form', ...item.component.config },
                } as any
              }
              context={context}
            />
          );
        case 'detail':
          return (
            <DetailRenderer
              config={
                {
                  layout: { type: 'detail', ...item.component.config },
                } as any
              }
              context={context}
            />
          );
        case 'form-detail':
          return (
            <FormDetailRenderer
              config={
                {
                  layout: { type: 'form-detail', ...item.component.config },
                } as any
              }
              context={context}
            />
          );
        case 'chart':
          return (
            <Card>
              <div
                style={{
                  height: 300,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                图表组件 (待实现)
              </div>
            </Card>
          );
        case 'stat':
          return (
            <Card>
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1677ff' }}>
                  {item.component.config.value || 0}
                </div>
                <div style={{ color: '#666', marginTop: 8 }}>
                  {item.component.config.label || '统计'}
                </div>
              </div>
            </Card>
          );
        case 'custom':
          return item.component.config.content || <Empty description="自定义内容" />;
        default:
          return <Empty description="未知组件类型" />;
      }
    }

    return <Empty description="无内容配置" />;
  };

  return (
    <div className="grid-layout">
      <Row gutter={gutter}>
        {items
          .filter((item) => item.visible !== false)
          .map((item) => (
            <Col
              key={item.key}
              {...getResponsiveColSpan(item)}
              style={{
                minWidth: item.minWidth,
                maxWidth: item.maxWidth,
              }}
            >
              {renderItemContent(item)}
            </Col>
          ))}
      </Row>
    </div>
  );
}
