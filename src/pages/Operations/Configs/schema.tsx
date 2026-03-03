import React from 'react';
import { Button, Space, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

export const CONFIG_FORMAT_OPTIONS = [
  { label: 'json', value: 'json' },
  { label: 'csv', value: 'csv' },
  { label: 'yaml', value: 'yaml' },
  { label: 'ini', value: 'ini' },
  { label: 'xml', value: 'xml' },
];

export type ConfigToolbarActionKey = 'query' | 'reset';

export const CONFIGS_TOOLBAR_SCHEMA = {
  filters: [
    { key: 'game', placeholder: 'Game', width: 140 },
    { key: 'env', placeholder: 'Env', width: 120 },
    { key: 'format', placeholder: '格式', width: 120 },
    { key: 'search', placeholder: '按 id 搜索', width: 300 },
  ] as Array<{ key: 'game' | 'env' | 'format' | 'search'; placeholder: string; width: number }>,
  actions: [
    { key: 'query', label: '查询', primary: true },
    { key: 'reset', label: '重置' },
  ] as Array<{ key: ConfigToolbarActionKey; label: string; primary?: boolean }>,
};

export function buildConfigColumns(onEdit: (id: string, format: string) => void): ColumnsType<any> {
  return [
    { title: 'ID', dataIndex: 'id', width: 260, ellipsis: true },
    { title: 'Format', dataIndex: 'format', width: 100, render: (v) => <Tag>{v}</Tag> },
    { title: 'Game', dataIndex: 'game_id', width: 120 },
    { title: 'Env', dataIndex: 'env', width: 100 },
    { title: 'Latest', dataIndex: 'latest_version', width: 80 },
    {
      title: '操作',
      key: 'act',
      width: 140,
      render: (_: any, r: any) => (
        <Button size="small" onClick={() => onEdit(r.id, r.format)}>
          编辑
        </Button>
      ),
    },
  ];
}

export function buildVersionColumns(
  onView: (version: number) => void,
  onDiff: (version: number) => void,
  onRollback: (version: number) => void,
): ColumnsType<any> {
  return [
    { title: '版本', dataIndex: 'version', width: 80 },
    {
      title: '时间',
      dataIndex: 'created_at',
      render: (v: any) => (v ? new Date(v).toLocaleString() : ''),
    },
    { title: '编辑者', dataIndex: 'editor', width: 120 },
    { title: '说明', dataIndex: 'message', ellipsis: true },
    {
      title: '操作',
      key: 'act',
      width: 220,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => onView(r.version)}>
            查看
          </Button>
          <Button size="small" onClick={() => onDiff(r.version)}>
            Diff
          </Button>
          <Button size="small" danger onClick={() => onRollback(r.version)}>
            回滚
          </Button>
        </Space>
      ),
    },
  ];
}
