import React from 'react';
import type { ProColumns } from '@ant-design/pro-components';
import { Badge, Button, Space, Tag, Tooltip } from 'antd';
import { ExperimentOutlined, EyeOutlined, HistoryOutlined } from '@ant-design/icons';
import type { PacksPageSchema } from './schema';
import type { PackItem } from './usePacksPage';

type BuildPacksColumnsOptions = {
  columns: PacksPageSchema['columns'];
  onShowDetail: (pack: PackItem) => void;
  onShowHistory: (pack: PackItem) => void;
  onOpenCanary: (pack: PackItem) => void;
};

const formatDate = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-';
  const text = String(value).trim();
  if (!text) return '-';
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN');
};

export const buildPacksColumns = ({
  columns,
  onShowDetail,
  onShowHistory,
  onOpenCanary,
}: BuildPacksColumnsOptions): ProColumns<PackItem>[] =>
  columns.map((col) => {
    if (col.key === 'id') {
      return {
        title: col.title,
        dataIndex: 'id',
        width: col.width,
        copyable: col.copyable,
      } as ProColumns<PackItem>;
    }
    if (col.key === 'name') {
      return {
        title: col.title,
        dataIndex: 'name',
        width: col.width,
        ellipsis: true,
      } as ProColumns<PackItem>;
    }
    if (col.key === 'version') {
      return {
        title: col.title,
        dataIndex: 'version',
        width: col.width,
        render: (text) => <Tag color="blue">{text}</Tag>,
      } as ProColumns<PackItem>;
    }
    if (col.key === 'category') {
      return {
        title: col.title,
        dataIndex: 'category',
        width: col.width,
        render: (text) => <Tag>{text}</Tag>,
      } as ProColumns<PackItem>;
    }
    if (col.key === 'functionsCount') {
      return {
        title: col.title,
        dataIndex: 'functionsCount',
        width: col.width,
        render: (text) => <Badge count={text} showZero style={{ backgroundColor: '#52c41a' }} />,
      } as ProColumns<PackItem>;
    }
    if (col.key === 'entitiesCount') {
      return {
        title: col.title,
        dataIndex: 'entitiesCount',
        width: col.width,
        render: (text) => <Badge count={text} showZero style={{ backgroundColor: '#1890ff' }} />,
      } as ProColumns<PackItem>;
    }
    if (col.key === 'status') {
      return {
        title: col.title,
        dataIndex: 'status',
        width: col.width,
        render: (text) => {
          const config = {
            active: { color: 'success', text: '活跃' },
            canary: { color: 'processing', text: '灰度' },
            disabled: { color: 'default', text: '禁用' },
            deprecated: { color: 'error', text: '废弃' },
          } as const;
          const c = config[text as keyof typeof config] || config.disabled;
          return <Tag color={c.color}>{c.text}</Tag>;
        },
      } as ProColumns<PackItem>;
    }
    if (col.key === 'size') {
      return { title: col.title, dataIndex: 'size', width: col.width } as ProColumns<PackItem>;
    }
    if (col.key === 'uploadedAt') {
      return {
        title: col.title,
        dataIndex: 'uploadedAt',
        width: col.width,
        render: (_, record) => formatDate(record.uploadedAt),
      } as ProColumns<PackItem>;
    }
    return {
      title: col.title,
      width: col.width,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onShowDetail(record)}
            />
          </Tooltip>
          <Tooltip title="版本历史">
            <Button
              type="link"
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => onShowHistory(record)}
            />
          </Tooltip>
          {record.status === 'active' && (
            <Tooltip title="灰度发布">
              <Button
                type="link"
                size="small"
                icon={<ExperimentOutlined />}
                onClick={() => onOpenCanary(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    } as ProColumns<PackItem>;
  });
