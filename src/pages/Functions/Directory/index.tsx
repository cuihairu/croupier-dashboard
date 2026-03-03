import React from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Space, Tag, Card, Descriptions, Drawer, Badge, Typography } from 'antd';
import { PlayCircleOutlined, FilterOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import type { SummaryRow } from './types';
import useDirectoryPage from './useDirectoryPage';

const { Text } = Typography;

export default function DirectoryPage() {
  const {
    loading,
    processedData,
    columns,
    headerActions,
    detailVisible,
    setDetailVisible,
    selectedFunction,
    drawerActions,
    buildInvokePath,
  } = useDirectoryPage();

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
        search={{ filterType: 'light', labelWidth: 'auto' }}
        dateFormatter="string"
        headerTitle="函数列表"
        toolBarRender={() => [
          <Button key="filter" icon={<FilterOutlined />}>
            高级筛选
          </Button>,
        ]}
      />

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
              <Card size="small" title="显示名称" style={{ marginTop: 16 }}>
                {selectedFunction.display_name?.zh || selectedFunction.display_name?.en}
              </Card>
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
                  {selectedFunction.menu.path && (
                    <Descriptions.Item label="调用路径">
                      {buildInvokePath(selectedFunction.menu.path, selectedFunction.id)}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )}

            <Card size="small" style={{ marginTop: 16 }}>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() =>
                  history.push(buildInvokePath(selectedFunction.menu?.path, selectedFunction.id))
                }
              >
                直接调用
              </Button>
            </Card>
          </Card>
        )}
      </Drawer>
    </PageContainer>
  );
}
