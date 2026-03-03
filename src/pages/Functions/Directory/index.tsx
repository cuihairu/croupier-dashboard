import React, { useEffect, useState, useMemo } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { App, Button, Space, Tag, Card, Descriptions, Drawer, Badge, Typography } from 'antd';
import { PlayCircleOutlined, ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';

import { listDescriptors, listFunctionInstances } from '@/services/api';
import { getFunctionSummary } from '@/services/api/functions-enhanced';
import { renderSchemaActions } from '@/components/page-schema/PageSchemaRenderer';
import { resolveSchemaIcon } from '@/components/page-schema/icons';
import { DIRECTORY_PAGE_SCHEMA } from './schema';
import { buildDirectoryColumns } from './columns';
import type { DetailRow, SummaryRow } from './types';

const { Text } = Typography;

async function fetchSummary(): Promise<SummaryRow[]> {
  const descriptors = await listDescriptors();
  const descMap = new Map<string, any>();
  (Array.isArray(descriptors) ? descriptors : []).forEach((d: any) => {
    if (d?.id) descMap.set(d.id, d);
  });

  try {
    const res = await getFunctionSummary();
    if (Array.isArray(res) && res.length > 0) {
      return res.map((item: any) => {
        const d = descMap.get(item.id) || {};
        return {
          ...item,
          version: item.version || d.version,
          category: item.category || d.category,
          display_name: item.display_name || d.display_name,
          summary: item.summary || d.summary,
          tags: Array.isArray(item.tags) ? item.tags : d.tags || [],
          menu: item.menu || d.menu,
        };
      });
    }
  } catch (error) {
    console.warn('Failed to fetch from summary API, falling back to descriptors');
  }
  return (Array.isArray(descriptors) ? descriptors : []).map((desc: any) => ({
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

  useEffect(() => {
    reload();
  }, []);

  // Enhanced data processing
  const processedData = useMemo(() => {
    return rows.map((row) => ({
      ...row,
      status: row.enabled ? 'active' : 'inactive',
      displayName: row.display_name?.zh || row.display_name?.en || row.id,
      categoryName: row.category || '未分类',
    }));
  }, [rows]);

  const handleViewDetail = async (record: SummaryRow) => {
    try {
      // Try to fetch more detailed information
      const detailInfo: DetailRow = { ...record };

      // If we have instances API, we could fetch that too
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

  const buildInvokePath = (basePath: string | undefined, functionId: string) => {
    const base = basePath || '/game/functions/invoke';
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}fid=${encodeURIComponent(functionId)}`;
  };

  const columns = useMemo(
    () =>
      buildDirectoryColumns({
        columns: DIRECTORY_PAGE_SCHEMA.columns,
        rowActions: DIRECTORY_PAGE_SCHEMA.rowActions,
        onOpenDetail: (id) => history.push(`/game/functions/${encodeURIComponent(id)}`),
        onOpenUI: (id) =>
          history.push(`/game/functions/${encodeURIComponent(id)}?tab=config&subTab=ui`),
        onInvoke: (record) => {
          const path = buildInvokePath(record.menu?.path, record.id);
          history.push(path);
        },
      }),
    [],
  );

  const headerActions = useMemo(
    () =>
      renderSchemaActions(
        {
          canWrite: true,
          flags: {},
          onAction: () => reload(),
          renderIcon: (icon) => resolveSchemaIcon(icon),
        },
        DIRECTORY_PAGE_SCHEMA.headerActions,
      ),
    [],
  );

  const drawerActions = useMemo(
    () =>
      renderSchemaActions(
        {
          canWrite: true,
          flags: { noSelection: !selectedFunction },
          onAction: () => {
            if (!selectedFunction) return;
            const path = buildInvokePath(selectedFunction.menu?.path, selectedFunction.id);
            history.push(path);
            setDetailVisible(false);
          },
          renderIcon: (icon) => resolveSchemaIcon(icon),
        },
        DIRECTORY_PAGE_SCHEMA.drawerActions,
      ),
    [selectedFunction],
  );

  return (
    <PageContainer title="函数目录" subTitle="浏览和管理系统中可用的函数" extra={headerActions}>
      <ProTable<SummaryRow>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={processedData}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个函数`,
        }}
        search={{
          filterType: 'light',
          labelWidth: 'auto',
        }}
        dateFormatter="string"
        headerTitle="函数列表"
        toolBarRender={() => [
          <Button key="filter" icon={<FilterOutlined />}>
            高级筛选
          </Button>,
        ]}
      />

      {/* Function Detail Drawer */}
      <Drawer
        title="函数详情"
        width={600}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        extra={drawerActions}
      >
        {selectedFunction && (
          <Card size="small" title="基本信息">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="函数ID">
                <Text code copyable>
                  {selectedFunction.id}
                </Text>
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
                {selectedFunction.instances !== undefined ? (
                  `${selectedFunction.instances} 个实例`
                ) : (
                  <Text type="secondary">未知</Text>
                )}
              </Descriptions.Item>
            </Descriptions>

            {(selectedFunction.display_name?.zh || selectedFunction.display_name?.en) && (
              <>
                <Card size="small" title="显示名称" style={{ marginTop: 16 }}>
                  {selectedFunction.display_name?.zh || selectedFunction.display_name?.en}
                </Card>
              </>
            )}

            {(selectedFunction.summary?.zh || selectedFunction.summary?.en) && (
              <Card size="small" title="函数描述" style={{ marginTop: 16 }}>
                {selectedFunction.summary?.zh || selectedFunction.summary?.en}
              </Card>
            )}

            {selectedFunction.tags && selectedFunction.tags.length > 0 && (
              <Card size="small" title="标签" style={{ marginTop: 16 }}>
                <Space wrap>
                  {selectedFunction.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </Card>
            )}

            {selectedFunction.menu && (
              <Card size="small" title="菜单信息" style={{ marginTop: 16 }}>
                <Descriptions column={1} size="small">
                  {Array.isArray(selectedFunction.menu.nodes) &&
                    selectedFunction.menu.nodes.length > 0 && (
                      <Descriptions.Item label="菜单节点">
                        <Space wrap>
                          {selectedFunction.menu.nodes.map((n) => (
                            <Tag key={n}>{n}</Tag>
                          ))}
                        </Space>
                      </Descriptions.Item>
                    )}
                </Descriptions>
              </Card>
            )}
          </Card>
        )}
      </Drawer>
    </PageContainer>
  );
};
