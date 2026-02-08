import React, { useEffect, useState, useMemo } from 'react';
import { PageContainer, ProTable, ProColumns } from '@ant-design/pro-components';
import { App, Button, Space, Tag, Card, Descriptions, Drawer, Badge, Tooltip, Typography } from 'antd';
import { EyeOutlined, PlayCircleOutlined, InfoCircleOutlined, ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { listDescriptors, listFunctionInstances } from '@/services/api';
import { getFunctionSummary, getFunctionDetail } from '@/services/api/functions-enhanced';

const { Text } = Typography;

type I18N = { zh?: string; en?: string };
type Menu = { section?: string; group?: string; path?: string; order?: number; hidden?: boolean };
type SummaryRow = { id: string; enabled?: boolean; display_name?: I18N; summary?: I18N; tags?: string[]; menu?: Menu; version?: string };
type DetailRow = SummaryRow & {
  description?: I18N;
  category?: string;
  author?: string;
  created_at?: string;
  updated_at?: string;
  instances?: number;
};

async function fetchSummary(): Promise<SummaryRow[]> {
  try {
    const res = await getFunctionSummary();
    if (Array.isArray(res)) {
      return res as SummaryRow[];
    }
  } catch (error) {
    console.warn('Failed to fetch from summary API, falling back to descriptors');
  }
  const descriptors = await listDescriptors();
  return descriptors.map((desc: any) => ({
    id: desc.id,
    version: desc.version,
    enabled: true,
    display_name: desc.display_name || { zh: desc.id, en: desc.id },
    summary: desc.summary || { zh: desc.description, en: desc.description },
    tags: desc.tags || [],
    category: desc.category,
  }));
}

export default () => {
  const { message } = App.useApp();
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<DetailRow | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await fetchSummary();
      setRows(data);
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  // Enhanced data processing
  const processedData = useMemo(() => {
    return rows.map(row => ({
      ...row,
      status: row.enabled ? 'active' : 'inactive',
      displayName: row.display_name?.zh || row.display_name?.en || row.id,
      categoryName: row.category || '未分类'
    }));
  }, [rows]);

  const handleViewDetail = async (record: SummaryRow) => {
    try {
      // Try to fetch complete function details from backend
      let detailInfo: DetailRow = { ...record };

      try {
        const fullDetail = await getFunctionDetail(record.id);
        // Merge full detail with the record data
        detailInfo = {
          ...record,
          ...fullDetail,
          // Preserve display_name and summary as fallback
          display_name: fullDetail.display_name || record.display_name,
          summary: fullDetail.summary || record.summary,
        };
      } catch (err) {
        console.warn('Failed to fetch full detail, using summary data:', err);
        // Fallback to summary data only
      }

      // Fetch instances count
      try {
        const instances = await listFunctionInstances({ function_id: record.id });
        detailInfo.instances = instances?.instances?.length || 0;
      } catch {
        detailInfo.instances = 0;
      }

      setSelectedFunction(detailInfo);
      setDetailVisible(true);
    } catch (error) {
      message.error('获取详细信息失败');
    }
  };

  const columns: ProColumns<SummaryRow>[] = [
    {
      title: '函数ID',
      dataIndex: 'id',
      width: 250,
      copyable: true,
      ellipsis: true,
      render: (_, record) => (
        <Space>
          <Badge status={record.enabled ? 'success' : 'default'} />
          <Text code>{record.id}</Text>
          {record.version && <Tag color="blue">v{record.version}</Tag>}
        </Space>
      )
    },
    {
      title: '函数名称',
      dataIndex: 'display_name',
      width: 200,
      ellipsis: true,
      render: (_, record) => record.display_name?.zh || record.display_name?.en || record.id
    },
    {
      title: '函数摘要',
      dataIndex: 'summary',
      width: 300,
      ellipsis: true,
      render: (_, record) => record.summary?.zh || record.summary?.en || '-'
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 120,
      filters: true,
      onFilter: (value, record) => record.category === value,
      render: (_, record) => (
        <Tag color={record.category ? 'geekblue' : 'default'}>
          {record.category || '未分类'}
        </Tag>
      )
    },
    {
      title: '标签',
      dataIndex: 'tags',
      width: 200,
      render: (_, record) => (
        <Space wrap>
          {(record.tags || []).slice(0, 3).map(tag => (
            <Tag key={tag} size="small">{tag}</Tag>
          ))}
          {(record.tags || []).length > 3 && (
            <Tag size="small">+{(record.tags || []).length - 3}</Tag>
          )}
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      filters: [
        { text: '启用', value: true },
        { text: '禁用', value: false }
      ],
      onFilter: (value, record) => record.enabled === value,
      render: (_, record) => (
        <Badge
          status={record.enabled ? 'success' : 'default'}
          text={record.enabled ? '启用' : '禁用'}
        />
      )
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      render: (_, record) => [
        <Tooltip key="detail" title="查看详情">
          <Button
            type="link"
            size="small"
            icon={<InfoCircleOutlined />}
            onClick={() => handleViewDetail(record)}
          />
        </Tooltip>,
        <Tooltip key="invoke" title="调用函数">
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => {
              const path = (record.menu?.path || '/game/functions') + `?fid=${encodeURIComponent(record.id)}`;
              history.push(path);
            }}
          />
        </Tooltip>
      ]
    }
  ];

  return (
    <PageContainer
      title="函数目录"
      subTitle="浏览和管理系统中可用的函数"
      extra={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={reload}>
          刷新
        </Button>
      ]}
    >
      <ProTable<SummaryRow>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={processedData}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个函数`
        }}
        search={{
          filterType: 'light',
          labelWidth: 'auto'
        }}
        dateFormatter="string"
        headerTitle="函数列表"
        toolBarRender={() => [
          <Button key="filter" icon={<FilterOutlined />}>
            高级筛选
          </Button>
        ]}
      />

      {/* Function Detail Drawer */}
      <Drawer
        title="函数详情"
        width={600}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        extra={
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => {
              if (selectedFunction) {
                const path = (selectedFunction.menu?.path || '/game/functions') + `?fid=${encodeURIComponent(selectedFunction.id)}`;
                history.push(path);
                setDetailVisible(false);
              }
            }}
          >
            调用函数
          </Button>
        }
      >
        {selectedFunction && (
          <>
            <Card size="small" title="基本信息">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="函数ID">
                  <Text code copyable>{selectedFunction.id}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="版本">
                  {selectedFunction.version || <Text type="secondary">未指定</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="分类">
                  <Tag color={selectedFunction.category ? 'geekblue' : 'default'}>
                    {selectedFunction.category || '未分类'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Badge
                    status={selectedFunction.enabled ? 'success' : 'default'}
                    text={selectedFunction.enabled ? '启用' : '禁用'}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="覆盖实例">
                  {selectedFunction.instances !== undefined
                    ? `${selectedFunction.instances} 个实例`
                    : <Text type="secondary">未知</Text>
                  }
                </Descriptions.Item>
                {selectedFunction.author && (
                  <Descriptions.Item label="作者">
                    {selectedFunction.author}
                  </Descriptions.Item>
                )}
                {selectedFunction.created_at && (
                  <Descriptions.Item label="创建时间">
                    {new Date(selectedFunction.created_at).toLocaleString('zh-CN')}
                  </Descriptions.Item>
                )}
                {selectedFunction.updated_at && (
                  <Descriptions.Item label="更新时间">
                    {new Date(selectedFunction.updated_at).toLocaleString('zh-CN')}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {(selectedFunction.display_name?.zh || selectedFunction.display_name?.en) && (
              <Card size="small" title="显示名称" style={{ marginTop: 16 }}>
                {selectedFunction.display_name?.zh || selectedFunction.display_name?.en}
                {selectedFunction.display_name?.zh && selectedFunction.display_name?.en && selectedFunction.display_name.zh !== selectedFunction.display_name.en && (
                  <div style={{ marginTop: 8, color: '#888' }}>
                    EN: {selectedFunction.display_name.en}
                  </div>
                )}
              </Card>
            )}

            {(selectedFunction.summary?.zh || selectedFunction.summary?.en || selectedFunction.description?.zh || selectedFunction.description?.en) && (
              <Card size="small" title="函数描述" style={{ marginTop: 16 }}>
                {selectedFunction.summary?.zh || selectedFunction.summary?.en || selectedFunction.description?.zh || selectedFunction.description?.en}
              </Card>
            )}

            {selectedFunction.tags && selectedFunction.tags.length > 0 && (
              <Card size="small" title="标签" style={{ marginTop: 16 }}>
                <Space wrap>
                  {selectedFunction.tags.map(tag => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </Card>
            )}

            {selectedFunction.menu && (selectedFunction.menu.section || selectedFunction.menu.group || selectedFunction.menu.path) && (
              <Card size="small" title="菜单信息" style={{ marginTop: 16 }}>
                <Descriptions column={1} size="small">
                  {selectedFunction.menu.section && (
                    <Descriptions.Item label="分组">{selectedFunction.menu.section}</Descriptions.Item>
                  )}
                  {selectedFunction.menu.group && (
                    <Descriptions.Item label="子分组">{selectedFunction.menu.group}</Descriptions.Item>
                  )}
                  {selectedFunction.menu.path && (
                    <Descriptions.Item label="路径">
                      <Text code copyable>{selectedFunction.menu.path}</Text>
                    </Descriptions.Item>
                  )}
                  {typeof selectedFunction.menu.order === 'number' && (
                    <Descriptions.Item label="排序">{selectedFunction.menu.order}</Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )}
          </>
        )}
      </Drawer>
    </PageContainer>
  );
};
