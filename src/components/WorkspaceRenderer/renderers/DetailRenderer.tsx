/**
 * 详情布局渲染器
 *
 * 显示详情信息，只读。
 *
 * @module components/WorkspaceRenderer/renderers/DetailRenderer
 */

import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Spin, message, Badge, Tag, Button, Space } from 'antd';
import type { DetailLayout } from '@/types/workspace';
import { request } from '@umijs/max';
import * as Icons from '@ant-design/icons';

export interface DetailRendererProps {
  /** 详情布局配置 */
  layout: DetailLayout;

  /** 对象标识 */
  objectKey: string;

  /** 额外的上下文数据 */
  context?: Record<string, any>;
}

/**
 * 详情布局渲染器组件
 */
export default function DetailRenderer({ layout, objectKey, context }: DetailRendererProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 加载数据
  const loadData = async () => {
    if (!layout.detailFunction) {
      return;
    }

    setLoading(true);
    try {
      // 调用详情函数
      const result = await request(`/api/v1/functions/${layout.detailFunction}/invoke`, {
        method: 'POST',
        data: context || {},
      });

      setData(result);
    } catch (error: any) {
      message.error(error.message || '加载详情失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [layout.detailFunction]);

  // 处理操作
  const handleAction = async (action: any) => {
    if (!action.function) {
      message.error('未配置操作函数');
      return;
    }

    try {
      await request(`/api/v1/functions/${action.function}/invoke`, {
        method: 'POST',
        data: data,
      });

      message.success(`${action.label}成功`);
      // 重新加载
      loadData();
    } catch (error: any) {
      message.error(error.message || `${action.label}失败`);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!data) {
    return <div style={{ textAlign: 'center', padding: '100px 0', color: '#999' }}>暂无数据</div>;
  }

  return (
    <div>
      {/* 详情分区 */}
      {(layout.sections || []).map((section, index) => (
        <Card
          key={index}
          title={section.title}
          style={{ marginBottom: 16 }}
          collapsible={section.collapsible ? 'header' : undefined}
          defaultCollapsed={!section.defaultExpanded}
        >
          <Descriptions column={section.column || 2}>
            {section.fields.map((field) => (
              <Descriptions.Item key={field.key} label={field.label} span={field.span}>
                {renderDetailField(field, data[field.key])}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      ))}

      {/* 操作区 */}
      {layout.actions && layout.actions.length > 0 && (
        <Card title="操作">
          <Space>
            {layout.actions.map((action) => (
              <Button
                key={action.key}
                type={action.buttonType || 'default'}
                danger={action.danger}
                icon={getIcon(action.icon)}
                onClick={() => handleAction(action)}
                disabled={action.disabled}
              >
                {action.label}
              </Button>
            ))}
          </Space>
        </Card>
      )}
    </div>
  );
}

/**
 * 渲染详情字段
 */
function renderDetailField(field: any, value: any): React.ReactNode {
  if (!value && value !== 0 && value !== false) return '-';

  const renderType = field.render || 'text';
  const options = field.renderOptions || {};

  switch (renderType) {
    case 'status':
      return renderStatus(value, options);

    case 'datetime':
      return renderDateTime(value, options);

    case 'date':
      return renderDate(value, options);

    case 'tag':
      return renderTag(value, options);

    case 'money':
      return renderMoney(value, options);

    case 'link':
      return renderLink(value, options);

    case 'image':
      return renderImage(value, options);

    case 'text':
    default:
      return value;
  }
}

/**
 * 渲染状态
 */
function renderStatus(value: any, options: any): React.ReactNode {
  const statusMap = options.statusMap || {
    1: { text: '启用', status: 'success' },
    0: { text: '禁用', status: 'default' },
  };

  const status = statusMap[value];
  if (!status) return value;

  return <Badge status={status.status} text={status.text} />;
}

/**
 * 渲染日期时间
 */
function renderDateTime(value: any, options: any): React.ReactNode {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 渲染日期
 */
function renderDate(value: any, options: any): React.ReactNode {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleDateString('zh-CN');
}

/**
 * 渲染标签
 */
function renderTag(value: any, options: any): React.ReactNode {
  const color = options.tagColor || 'blue';
  return <Tag color={typeof color === 'function' ? color(value) : color}>{value}</Tag>;
}

/**
 * 渲染金额
 */
function renderMoney(value: any, options: any): React.ReactNode {
  const symbol = options.currencySymbol || '¥';
  const precision = options.currencyPrecision || 2;
  return `${symbol}${Number(value).toFixed(precision)}`;
}

/**
 * 渲染链接
 */
function renderLink(value: any, options: any): React.ReactNode {
  const target = options.linkTarget || '_blank';
  return (
    <a href={value} target={target} rel="noopener noreferrer">
      {value}
    </a>
  );
}

/**
 * 渲染图片
 */
function renderImage(value: any, options: any): React.ReactNode {
  return <img src={value} alt="" style={{ width: 100, height: 100, objectFit: 'cover' }} />;
}

/**
 * 根据图标名称获取图标组件
 */
function getIcon(iconName?: string): React.ReactNode {
  if (!iconName) return null;
  const IconComponent = (Icons as any)[iconName];
  return IconComponent ? <IconComponent /> : null;
}
