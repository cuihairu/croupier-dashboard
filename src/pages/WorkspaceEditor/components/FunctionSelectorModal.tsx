/**
 * 函数选择 Modal 组件
 *
 * 用于快速选择和添加函数，支持树形分组和多选。
 *
 * @module pages/WorkspaceEditor/components/FunctionSelectorModal
 */

import React, { useMemo, useState } from 'react';
import { Modal, Input, Tree, Checkbox, Tag, Space, Typography, Button, Empty, Spin } from 'antd';
import { SearchOutlined, CheckOutlined } from '@ant-design/icons';
import type { FunctionDescriptor } from '@/services/api/functions';
import type { TreeProps } from 'antd';

const { Text } = Typography;

export interface FunctionSelectorModalProps {
  open: boolean;
  functions: FunctionDescriptor[];
  selectedFunctionIds: string[];
  onOk: (functionIds: string[]) => void;
  onCancel: () => void;
  title?: string;
  multiple?: boolean;
}

/** 操作类型颜色映射 */
const OPERATION_COLOR: Record<string, string> = {
  list: '#1677ff',
  query: '#52c41a',
  create: '#13c2c2',
  update: '#fa8c14',
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

/** 按实体和操作类型分组 */
function groupFunctions(functions: FunctionDescriptor[]) {
  const groups: Record<
    string,
    {
      label: string;
      functions: FunctionDescriptor[];
    }
  > = {};

  functions.forEach((func) => {
    // 按 entity 分组
    const groupKey = func.entity || func.category || '未分类';
    if (!groups[groupKey]) {
      groups[groupKey] = { label: groupKey, functions: [] };
    }
    groups[groupKey].functions.push(func);
  });

  return Object.entries(groups)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export default function FunctionSelectorModal({
  open,
  functions,
  selectedFunctionIds,
  onOk,
  onCancel,
  title = '选择函数',
  multiple = true,
}: FunctionSelectorModalProps) {
  const [searchText, setSearchText] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>(selectedFunctionIds);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // 当打开 modal 时，同步已选函数
  React.useEffect(() => {
    if (open) {
      setSelectedKeys(selectedFunctionIds);
      // 默认展开所有分组
      const grouped = groupFunctions(functions);
      setExpandedKeys(grouped.map((g) => g.key));
    }
  }, [open, selectedFunctionIds, functions]);

  // 分组后的函数
  const groupedFunctions = useMemo(() => {
    return groupFunctions(functions);
  }, [functions]);

  // 过滤后的函数
  const filteredGroups = useMemo(() => {
    if (!searchText) return groupedFunctions;

    const text = searchText.toLowerCase();
    return groupedFunctions
      .map((group) => ({
        ...group,
        functions: group.functions.filter((func) => {
          return (
            func.id.toLowerCase().includes(text) ||
            func.display_name?.zh?.toLowerCase().includes(text) ||
            func.operation?.toLowerCase().includes(text) ||
            func.entity?.toLowerCase().includes(text) ||
            func.category?.toLowerCase().includes(text)
          );
        }),
      }))
      .filter((group) => group.functions.length > 0);
  }, [groupedFunctions, searchText]);

  // 树形数据结构
  const treeData = useMemo(() => {
    return filteredGroups.map((group) => ({
      title: (
        <Space size={8}>
          <span>{group.label}</span>
          <Tag>{group.functions.length}</Tag>
        </Space>
      ),
      key: group.key,
      selectable: false,
      children: group.functions.map((func) => {
        const isSelected = selectedKeys.includes(func.id);
        const op = func.operation || 'custom';
        return {
          title: (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 0',
              }}
            >
              <Space size={8}>
                {multiple && (
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleFunctionSelection(func.id);
                    }}
                  />
                )}
                <div>
                  <div>{func.display_name?.zh || func.id}</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {func.id}
                  </Text>
                </div>
              </Space>
              <Tag color={OPERATION_TAG_COLOR[op] || 'default'} style={{ fontSize: 11 }}>
                {op}
              </Tag>
            </div>
          ),
          key: func.id,
          selectable: !multiple,
          isLeaf: true,
          func,
        };
      }),
    }));
  }, [filteredGroups, selectedKeys, multiple]);

  const toggleFunctionSelection = (funcId: string) => {
    if (multiple) {
      setSelectedKeys((prev) => {
        if (prev.includes(funcId)) {
          return prev.filter((id) => id !== funcId);
        } else {
          return [...prev, funcId];
        }
      });
    } else {
      setSelectedKeys([funcId]);
    }
  };

  const handleOk = () => {
    onOk(selectedKeys);
  };

  const handleSelect: TreeProps['onSelect'] = (selectedKeys, info) => {
    if (!multiple && info.node.isLeaf) {
      setSelectedKeys(selectedKeys as string[]);
    }
  };

  const handleTreeClick: TreeProps['onClick'] = (info) => {
    // 点击节点时处理
    if (info.node.isLeaf && !multiple) {
      const funcId = info.node.key as string;
      setSelectedKeys([funcId]);
    }
  };

  return (
    <Modal
      title={
        <Space size={8}>
          <span>{title}</span>
          {selectedKeys.length > 0 && <Tag color="blue">已选 {selectedKeys.length}</Tag>}
        </Space>
      }
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      width={640}
      okText={multiple ? `添加 ${selectedKeys.length} 个函数` : '确定'}
      okButtonProps={{ disabled: selectedKeys.length === 0 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Input
          placeholder="搜索函数名称、ID、操作类型..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />

        {!searchText && multiple && selectedKeys.length > 0 && (
          <div style={{ padding: '8px 12px', background: '#f6ffed', borderRadius: 4 }}>
            <Space size={8} wrap>
              <Text type="success" strong>
                已选 {selectedKeys.length} 个函数：
              </Text>
              {selectedKeys.map((id) => {
                const func = functions.find((f) => f.id === id);
                return (
                  <Tag key={id} closable color="blue" onClose={() => toggleFunctionSelection(id)}>
                    {func?.display_name?.zh || id}
                  </Tag>
                );
              })}
            </Space>
          </div>
        )}

        {filteredGroups.length === 0 ? (
          <Empty description="没有找到匹配的函数" />
        ) : (
          <div
            style={{
              maxHeight: 400,
              overflow: 'auto',
              border: '1px solid #f0f0f0',
              borderRadius: 4,
              padding: '8px 12px',
            }}
          >
            <Tree
              treeData={treeData}
              expandedKeys={expandedKeys}
              onExpand={setExpandedKeys}
              selectedKeys={multiple ? [] : selectedKeys}
              onSelect={handleSelect}
              onClick={handleTreeClick}
              showLine={{ showLeafIcon: false }}
              blockNode
            />
          </div>
        )}
      </Space>
    </Modal>
  );
}

/** 快速函数选择器（单选） */
export interface QuickFunctionPickerProps {
  functions: FunctionDescriptor[];
  value?: string;
  onChange?: (functionId: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  allowClear?: boolean;
}

export function QuickFunctionPicker({
  functions,
  value,
  onChange,
  placeholder = '选择函数',
  style,
  allowClear = true,
}: QuickFunctionPickerProps) {
  const [open, setOpen] = useState(false);

  const selectedFunction = functions.find((f) => f.id === value);

  return (
    <>
      <Input
        value={selectedFunction?.display_name?.zh || selectedFunction?.id || value}
        placeholder={placeholder}
        readOnly
        onClick={() => setOpen(true)}
        style={{ cursor: 'pointer', ...style }}
        allowClear={allowClear}
        onClear={() => onChange?.('')}
      />

      <FunctionSelectorModal
        open={open}
        functions={functions}
        selectedFunctionIds={value ? [value] : []}
        onOk={(ids) => {
          if (ids.length > 0) {
            onChange?.(ids[0]);
          }
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
        title="选择函数"
        multiple={false}
      />
    </>
  );
}
