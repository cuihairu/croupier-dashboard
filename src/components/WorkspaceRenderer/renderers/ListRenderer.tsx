/**
 * 列表布局渲染器
 *
 * 渲染列表布局，支持分页、搜索、行操作等。
 *
 * @module components/WorkspaceRenderer/renderers/ListRenderer
 */

import React, { useEffect, useState } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Space, message, Tag, Badge } from 'antd';
import type { ListLayout } from '@/types/workspace';
import { request } from '@umijs/max';
import * as Icons from '@ant-design/icons';

export interface ListRendererProps {
  /** 列表布局配置 */
  layout: ListLayout;

  /** 对象标识 */
  objectKey: string;

  /** 额外的上下文数据 */
  context?: Record<string, any>;
}

/**
 * 列表布局渲染器组件
 */
export default function ListRenderer({ layout, objectKey, context }: ListRendererProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 加载数据
  const loadData = async (params?: any) => {
    if (!layout.listFunction) {
      message.error('未配置列表函数');
      return;
    }

    setLoading(true);
    try {
      // 调用函数获取数据
      const result = await request(`/api/v1/functions/${layout.listFunction}/invoke`, {
        method: 'POST',
        data: {
          page: params?.current || current,
          pageSize: params?.pageSize || pageSize,
          ...params?.filters,
        },
      });

      // 处理返回数据
      if (Array.isArray(result)) {
        setData(result);
        setTotal(result.length);
      } else if (result?.data) {
        setData(result.data);
        setTotal(result.total || result.data.length);
      } else {
        setData([]);
        setTotal(0);
      }
    } catch (error: any) {
      message.error(error.message || '加载数据失败');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [layout.listFunction]);

  // 生成列配置
  const columns: ProColumns<any>[] = (layout.columns || []).map((col) => ({
    title: col.title,
    dataIndex: col.key,
    key: col.key,
    width: col.width,
    align: col.align,
    fixed: col.fixed,
    sorter: col.sortable,
    render: (text: any, record: any) => renderColumn(col, text, record),
  }));

  // 添加行操作列
  if (layout.rowActions && layout.rowActions.length > 0) {
    columns.push({
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          {layout.rowActions?.map((action) => (
            <Button
              key={action.key}
              type="link"
              size="small"
              icon={getIcon(action.icon)}
              onClick={() => handleRowAction(action, record)}
            >
              {action.label}
            </Button>
          ))}
        </Space>
      ),
    });
  }

  // 处理行操作
  const handleRowAction = async (action: any, record: any) => {
    // TODO: 实现行操作处理
    message.info(`执行操作: ${action.label}`);
  };

  // 处理工具栏操作
  const handleToolbarAction = async (action: any) => {
    // TODO: 实现工具栏操作处理
    message.info(`执行操作: ${action.label}`);
  };

  return (
    <ProTable
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey="id"
      search={false}
      pagination={
        layout.pagination !== false
          ? {
              current,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, size) => {
                setCurrent(page);
                setPageSize(size);
                loadData({ current: page, pageSize: size });
              },
            }
          : false
      }
      toolBarRender={() => [
        <Button key="refresh" onClick={() => loadData()}>
          刷新
        </Button>,
        ...(layout.toolbarActions || []).map((action) => (
          <Button
            key={action.key}
            type={action.buttonType || 'default'}
            danger={action.danger}
            icon={getIcon(action.icon)}
            onClick={() => handleToolbarAction(action)}
          >
            {action.label}
          </Button>
        )),
      ]}
      options={{
        reload: () => loadData(),
        density: true,
        fullScreen: true,
        setting: true,
      }}
    />
  );
}

/**
 * 渲染列内容
 */
function renderColumn(col: any, text: any, record: any): React.ReactNode {
  if (!text && text !== 0 && text !== false) return '-';

  const renderType = col.render || 'text';
  const options = col.renderOptions || {};

  switch (renderType) {
    case 'status':
      return renderStatus(text, options);

    case 'datetime':
      return renderDateTime(text, options);

    case 'date':
      return renderDate(text, options);

    case 'tag':
      return renderTag(text, options);

    case 'money':
      return renderMoney(text, options);

    case 'link':
      return renderLink(text, record, options);

    case 'image':
      return renderImage(text, options);

    case 'text':
    default:
      return text;
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
function renderLink(value: any, record: any, options: any): React.ReactNode {
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
  return (
    <img
      src={value}
      alt=""
      style={{ width: 50, height: 50, objectFit: 'cover' }}
      preview={options.imagePreview !== false}
    />
  );
}

/**
 * 根据图标名称获取图标组件
 */
function getIcon(iconName?: string): React.ReactNode {
  if (!iconName) return null;
  const IconComponent = (Icons as any)[iconName];
  return IconComponent ? <IconComponent /> : null;
}
