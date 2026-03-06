/**
 * 函数列表组件
 *
 * 显示可用的函数列表，支持拖拽到布局设计器。
 *
 * @module pages/WorkspaceEditor/components/FunctionList
 */

import React from 'react';
import { Card, List, Tag, Typography, Input, Button, Tooltip } from 'antd';
import { SearchOutlined, MenuFoldOutlined } from '@ant-design/icons';

export interface FunctionListProps {
  functions: any[];
  onCollapse?: () => void;
}

const OPERATION_COLOR: Record<string, string> = {
  list: '#1677ff',
  query: '#52c41a',
  create: '#13c2c2',
  update: '#fa8c16',
  delete: '#ff4d4f',
  action: '#722ed1',
  read: '#52c41a',
  custom: '#eb2f96',
};

const OPERATION_TAG_COLOR: Record<string, string> = {
  list: 'blue',
  query: 'green',
  create: 'cyan',
  update: 'orange',
  delete: 'red',
  action: 'purple',
  read: 'green',
  custom: 'magenta',
};

// 根据 entity 生成稳定的背景色（浅色）
const ENTITY_BG_COLORS = [
  '#f0f5ff',
  '#f6ffed',
  '#fff7e6',
  '#fff0f6',
  '#f9f0ff',
  '#e6fffb',
  '#fffbe6',
  '#fff1f0',
  '#fcffe6',
  '#e6f4ff',
];

function entityColorIndex(entity?: string): number {
  if (!entity) return 0;
  let hash = 0;
  for (let i = 0; i < entity.length; i++) hash = (hash * 31 + entity.charCodeAt(i)) & 0xffff;
  return hash % ENTITY_BG_COLORS.length;
}

export default function FunctionList({ functions, onCollapse }: FunctionListProps) {
  const [searchText, setSearchText] = React.useState('');

  const filteredFunctions = functions.filter((func) => {
    if (!searchText) return true;
    const text = searchText.toLowerCase();
    return (
      func.id.toLowerCase().includes(text) ||
      func.display_name?.zh?.toLowerCase().includes(text) ||
      func.operation?.toLowerCase().includes(text) ||
      func.entity?.toLowerCase().includes(text) ||
      func.category?.toLowerCase().includes(text)
    );
  });

  const handleDragStart = (e: React.DragEvent, func: any) => {
    e.dataTransfer.setData('function', JSON.stringify(func));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <Card
      title="可用函数"
      style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
      extra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Input
            placeholder="搜索"
            prefix={<SearchOutlined />}
            size="small"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 100 }}
            allowClear
          />
          {onCollapse && (
            <Tooltip title="收起">
              <Button
                type="text"
                size="small"
                icon={<MenuFoldOutlined />}
                onClick={onCollapse}
                style={{ color: '#666', flexShrink: 0 }}
              />
            </Tooltip>
          )}
        </div>
      }
    >
      <List
        dataSource={filteredFunctions}
        renderItem={(func) => {
          const op = func.operation || 'custom';
          const borderColor = OPERATION_COLOR[op] || '#d9d9d9';
          const bgColor = ENTITY_BG_COLORS[entityColorIndex(func.entity || func.category)];
          const tagColor = OPERATION_TAG_COLOR[op] || 'default';

          return (
            <List.Item
              draggable
              onDragStart={(e) => handleDragStart(e, func)}
              style={{
                cursor: 'grab',
                padding: '10px 12px',
                borderRadius: 6,
                marginBottom: 8,
                backgroundColor: bgColor,
                borderLeft: `4px solid ${borderColor}`,
                border: `1px solid ${borderColor}22`,
                borderLeftWidth: 4,
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 8px ${borderColor}44`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <List.Item.Meta
                title={
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    {func.display_name?.zh || func.id}
                  </Typography.Text>
                }
                description={
                  <div style={{ marginTop: 2 }}>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 11, display: 'block', marginBottom: 4 }}
                      ellipsis
                    >
                      {func.id}
                    </Typography.Text>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {op && (
                        <Tag color={tagColor} style={{ margin: 0, fontSize: 11 }}>
                          {op}
                        </Tag>
                      )}
                      {func.entity && (
                        <Tag color="default" style={{ margin: 0, fontSize: 11 }}>
                          {func.entity}
                        </Tag>
                      )}
                      {func.category && !func.entity && (
                        <Tag color="default" style={{ margin: 0, fontSize: 11 }}>
                          {func.category}
                        </Tag>
                      )}
                    </div>
                  </div>
                }
              />
            </List.Item>
          );
        }}
        locale={{ emptyText: '暂无可用函数' }}
      />
    </Card>
  );
}
