import React from 'react';
import { Card, Space, Alert, Tabs, Button } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import { FilterOutlined } from '@ant-design/icons';
import type { PackItem } from './usePacksPage';

type Props = {
  activeTab: string;
  onTabChange: (key: string) => void;
  columns: any[];
  dataSource: PackItem[];
  loading: boolean;
  toolbarActions: React.ReactNode[];
  manifest: any;
  etag?: string;
};

export default function OverviewCard({
  activeTab,
  onTabChange,
  columns,
  dataSource,
  loading,
  toolbarActions,
  manifest,
  etag,
}: Props) {
  return (
    <Card>
      <Tabs
        activeKey={activeTab}
        onChange={onTabChange}
        items={[
          {
            key: 'overview',
            label: '包列表',
            children: (
              <ProTable<PackItem>
                rowKey="id"
                columns={columns}
                dataSource={dataSource}
                loading={loading}
                pagination={{ pageSize: 10, showSizeChanger: true, showQuickJumper: true }}
                search={false}
                rowSelection={{ type: 'checkbox' }}
                toolBarRender={() => toolbarActions}
              />
            ),
          },
          {
            key: 'manifest',
            label: 'Manifest JSON',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert
                  message="当前加载的 manifest.json"
                  description={etag ? `ETag: ${etag.slice(0, 12)}...` : undefined}
                  type="info"
                  showIcon
                />
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    background: '#1e1e1e',
                    color: '#d4d4d4',
                    padding: 16,
                    borderRadius: 4,
                    fontSize: 12,
                    maxHeight: 500,
                    overflow: 'auto',
                  }}
                >
                  {JSON.stringify(manifest, null, 2)}
                </pre>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  );
}
