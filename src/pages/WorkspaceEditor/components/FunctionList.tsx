/**
 * 函数列表组件
 *
 * 显示可用的函数列表，支持拖拽到布局设计器。
 *
 * @module pages/WorkspaceEditor/components/FunctionList
 */

import React from 'react';
import { Card, List, Tag, Typography, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export interface FunctionListProps {
  /** 函数列表 */
  functions: any[];
}

/**
 * 函数列表组件
 */
export default function FunctionList({ functions }: FunctionListProps) {
  const [searchText, setSearchText] = React.useState('');

  // 过滤函数
  const filteredFunctions = functions.filter((func) => {
    if (!searchText) return true;
    const text = searchText.toLowerCase();
    return (
      func.id.toLowerCase().includes(text) ||
      func.display_name?.zh?.toLowerCase().includes(text) ||
      func.operation?.toLowerCase().includes(text)
    );
  });

  // 处理拖拽开始
  const handleDragStart = (e: React.DragEvent, func: any) => {
    e.dataTransfer.setData('function', JSON.stringify(func));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <Card
      title="可用函数"
      style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
      extra={
        <Input
          placeholder="搜索函数"
          prefix={<SearchOutlined />}
          size="small"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 150 }}
        />
      }
    >
      <List
        dataSource={filteredFunctions}
        renderItem={(func) => (
          <List.Item
            draggable
            onDragStart={(e) => handleDragStart(e, func)}
            style={{
              cursor: 'move',
              padding: '12px',
              border: '1px solid #f0f0f0',
              borderRadius: '4px',
              marginBottom: '8px',
              backgroundColor: '#fafafa',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e6f7ff';
              e.currentTarget.style.borderColor = '#1890ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#fafafa';
              e.currentTarget.style.borderColor = '#f0f0f0';
            }}
          >
            <List.Item.Meta
              title={
                <div>
                  <Typography.Text strong>{func.display_name?.zh || func.id}</Typography.Text>
                </div>
              }
              description={
                <>
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
                  >
                    {func.id}
                  </Typography.Text>
                  <Tag color={getOperationColor(func.operation)}>{func.operation}</Tag>
                </>
              }
            />
          </List.Item>
        )}
        locale={{ emptyText: '暂无可用函数' }}
      />
    </Card>
  );
}

/**
 * 根据操作类型获取标签颜色
 */
function getOperationColor(operation: string): string {
  const colorMap: Record<string, string> = {
    list: 'blue',
    query: 'green',
    create: 'cyan',
    update: 'orange',
    delete: 'red',
    action: 'purple',
  };
  return colorMap[operation] || 'default';
}
