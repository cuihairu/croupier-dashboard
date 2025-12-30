import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Space, Button, Input, Select, Tag, Checkbox, Modal, message, Tooltip, Popconfirm } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  ImportOutlined,
  DeleteOutlined,
  CopyOutlined,
  CheckOutlined,
  CloseOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import type { ColumnsType } from 'antd/es/table';
import {
  listDescriptors,
  updateFunctionStatus,
  batchUpdateFunctions,
  copyFunction,
  deleteFunction
} from '@/services/api/functions';
import GameSelector from '@/components/GameSelector';

const { Search } = Input;
const { Option } = Select;

interface FunctionDescriptor {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  version?: string;
  enabled: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  provider?: string;
  agentCount?: number;
  health?: 'healthy' | 'unhealthy' | 'unknown';
}

export default function FunctionsPage() {
  const intl = useIntl();
  const [loading, setLoading] = useState(false);
  const [functions, setFunctions] = useState<FunctionDescriptor[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Load functions
  const loadFunctions = async () => {
    setLoading(true);
    try {
      const gameId = localStorage.getItem('game_id') || undefined;
      const env = localStorage.getItem('env') || undefined;
      const result = await listDescriptors({ game_id: gameId, env });
      setFunctions(result || []);
    } catch (error: any) {
      message.error('加载函数列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFunctions();
  }, []);

  // Refresh functions
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFunctions();
    setRefreshing(false);
  };

  // Filter functions
  const filteredFunctions = functions.filter((func) => {
    const matchSearch = !searchText ||
      func.id.toLowerCase().includes(searchText.toLowerCase()) ||
      func.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      func.description?.toLowerCase().includes(searchText.toLowerCase());

    const matchStatus = filterStatus === 'all' ||
      (filterStatus === 'enabled' && func.enabled) ||
      (filterStatus === 'disabled' && !func.enabled);

    const matchCategory = filterCategory === 'all' || func.category === filterCategory;

    return matchSearch && matchStatus && matchCategory;
  });

  // Get unique categories
  const categories = Array.from(new Set(functions.map(f => f.category).filter(Boolean)));

  // Handle status toggle
  const handleStatusToggle = async (id: string, enabled: boolean) => {
    try {
      await updateFunctionStatus(id, { enabled });
      message.success(enabled ? '函数已启用' : '函数已禁用');
      loadFunctions();
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  // Handle batch operations
  const handleBatchEnable = async (enabled: boolean) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要操作的函数');
      return;
    }

    Modal.confirm({
      title: enabled ? '批量启用' : '批量禁用',
      content: `确定要${enabled ? '启用' : '禁用'}选中的 ${selectedRowKeys.length} 个函数吗？`,
      onOk: async () => {
        try {
          await batchUpdateFunctions({
            function_ids: selectedRowKeys as string[],
            enabled
          });
          message.success(`成功${enabled ? '启用' : '禁用'} ${selectedRowKeys.length} 个函数`);
          setSelectedRowKeys([]);
          loadFunctions();
        } catch (error) {
          message.error('批量操作失败');
        }
      }
    });
  };

  // Handle batch copy
  const handleBatchCopy = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要复制的函数');
      return;
    }

    Modal.confirm({
      title: '批量复制',
      content: `确定要复制选中的 ${selectedRowKeys.length} 个函数吗？`,
      onOk: async () => {
        try {
          const promises = selectedRowKeys.map(id => copyFunction(id));
          await Promise.all(promises);
          message.success(`成功复制 ${selectedRowKeys.length} 个函数`);
          setSelectedRowKeys([]);
          loadFunctions();
        } catch (error) {
          message.error('批量复制失败');
        }
      }
    });
  };

  // Handle batch delete
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的函数');
      return;
    }

    Modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个函数吗？此操作不可恢复！`,
      okType: 'danger',
      onOk: async () => {
        try {
          const promises = selectedRowKeys.map(id => deleteFunction(id));
          await Promise.all(promises);
          message.success(`成功删除 ${selectedRowKeys.length} 个函数`);
          setSelectedRowKeys([]);
          loadFunctions();
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  // Health status tag
  const HealthTag = ({ status }: { status: string }) => {
    const config = {
      healthy: { color: 'green', text: '健康' },
      unhealthy: { color: 'red', text: '异常' },
      unknown: { color: 'gray', text: '未知' }
    }[status] || config.unknown;

    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<FunctionDescriptor> = [
    {
      title: '函数ID',
      dataIndex: 'id',
      key: 'id',
      width: 300,
      render: (text: string) => <code>{text}</code>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (text: string) => <Tag color="blue">{text || '默认'}</Tag>,
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 100,
      render: (text: string) => <Tag>{text || '1.0.0'}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean, record: FunctionDescriptor) => (
        <Tooltip title={enabled ? '点击禁用' : '点击启用'}>
          <Button
            type="text"
            icon={enabled ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CloseOutlined style={{ color: '#f5222d' }} />}
            onClick={() => handleStatusToggle(record.id, !enabled)}
          >
            {enabled ? '已启用' : '已禁用'}
          </Button>
        </Tooltip>
      ),
      filters: [
        { text: '已启用', value: 'enabled' },
        { text: '已禁用', value: 'disabled' },
      ],
      onFilter: (value: any, record: FunctionDescriptor) =>
        value === 'enabled' ? record.enabled : !record.enabled,
    },
    {
      title: '健康状态',
      dataIndex: 'health',
      key: 'health',
      width: 100,
      render: (status: string) => <HealthTag status={status || 'unknown'} />,
    },
    {
      title: 'Agent数量',
      dataIndex: 'agentCount',
      key: 'agentCount',
      width: 100,
      render: (count: number) => count || 0,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[]) => (
        <Space wrap>
          {tags?.slice(0, 2).map(tag => <Tag key={tag}>{tag}</Tag>)}
          {tags?.length > 2 && <Tag>+{tags.length - 2}</Tag>}
        </Space>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record: FunctionDescriptor) => (
        <Space>
          <Tooltip title="配置">
            <Button type="text" icon={<SettingOutlined />} />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个函数吗？"
            onConfirm={() => {
              deleteFunction(record.id).then(() => {
                message.success('删除成功');
                loadFunctions();
              }).catch(() => {
                message.error('删除失败');
              });
            }}
          >
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record: FunctionDescriptor) => ({
      name: record.id,
    }),
  };

  return (
    <PageContainer
      title="函数管理"
      extra={[
        <GameSelector key="game-selector" />,
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={refreshing}
        >
          刷新
        </Button>,
      ]}
    >
      <Card>
        {/* 搜索和筛选 */}
        <Space style={{ marginBottom: 16 }}>
          <Search
            placeholder="搜索函数ID、名称或描述"
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />

          <Select
            placeholder="状态筛选"
            style={{ width: 120 }}
            value={filterStatus}
            onChange={setFilterStatus}
          >
            <Option value="all">全部</Option>
            <Option value="enabled">已启用</Option>
            <Option value="disabled">已禁用</Option>
          </Select>

          <Select
            placeholder="分类筛选"
            style={{ width: 150 }}
            value={filterCategory}
            onChange={setFilterCategory}
            allowClear
          >
            <Option value="all">全部分类</Option>
            {categories.map(cat => (
              <Option key={cat} value={cat}>{cat}</Option>
            ))}
          </Select>

          {selectedRowKeys.length > 0 && (
            <>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleBatchEnable(true)}
              >
                批量启用
              </Button>
              <Button
                icon={<CloseOutlined />}
                onClick={() => handleBatchEnable(false)}
              >
                批量禁用
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={handleBatchCopy}
              >
                批量复制
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
              >
                批量删除
              </Button>
            </>
          )}

          <Button icon={<ExportOutlined />}>导出</Button>
          <Button icon={<ImportOutlined />}>导入</Button>
        </Space>

        {/* 函数列表 */}
        <Table
          columns={columns}
          dataSource={filteredFunctions}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            total: filteredFunctions.length,
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个函数`,
          }}
        />
      </Card>
    </PageContainer>
  );
}