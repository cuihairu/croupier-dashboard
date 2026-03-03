import React from 'react';
import { Drawer, Tabs, Descriptions, Typography, Tag, List, Space } from 'antd';
import type { PackItem } from './usePacksPage';

type Props = {
  open: boolean;
  onClose: () => void;
  selectedPack: PackItem | null;
  packContent: any;
};

export default function PackDetailDrawer({ open, onClose, selectedPack, packContent }: Props) {
  return (
    <Drawer
      title={`包详情 - ${selectedPack?.name || selectedPack?.id}`}
      placement="right"
      width={720}
      open={open}
      onClose={onClose}
    >
      {selectedPack && packContent && (
        <Tabs
          defaultActiveKey="overview"
          items={[
            {
              key: 'overview',
              label: '概览',
              children: (
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="包ID" span={2}>
                    <Typography.Text copyable>{selectedPack.id}</Typography.Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="名称" span={2}>
                    {selectedPack.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="版本">
                    <Tag color="blue">{selectedPack.version}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="分类">
                    <Tag>{selectedPack.category}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Tag
                      color={
                        selectedPack.status === 'active'
                          ? 'success'
                          : selectedPack.status === 'canary'
                          ? 'processing'
                          : 'default'
                      }
                    >
                      {selectedPack.status}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="大小">{selectedPack.size}</Descriptions.Item>
                  <Descriptions.Item label="函数数量" span={2}>
                    {selectedPack.functionsCount}
                  </Descriptions.Item>
                  <Descriptions.Item label="实体数量" span={2}>
                    {selectedPack.entitiesCount}
                  </Descriptions.Item>
                  <Descriptions.Item label="上传者">{selectedPack.uploadedBy}</Descriptions.Item>
                  <Descriptions.Item label="上传时间">
                    {new Date(selectedPack.uploadedAt).toLocaleString('zh-CN')}
                  </Descriptions.Item>
                  <Descriptions.Item label="描述" span={2}>
                    {selectedPack.description || '-'}
                  </Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'functions',
              label: `函数 (${packContent.functions?.length || 0})`,
              children: (
                <List
                  dataSource={packContent.functions}
                  renderItem={(fn: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Typography.Text code>{fn.id}</Typography.Text>
                            <Tag color="blue">{fn.version}</Tag>
                          </Space>
                        }
                        description={fn.summary?.en || fn.summary?.zh || fn.description}
                      />
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: 'entities',
              label: `实体 (${packContent.entities?.length || 0})`,
              children: (
                <List
                  dataSource={packContent.entities}
                  renderItem={(ent: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Typography.Text code>{ent.id}</Typography.Text>
                            <Tag color="purple">{ent.type}</Tag>
                          </Space>
                        }
                        description={ent.description}
                      />
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: 'schemas',
              label: `Schemas (${packContent.schemas?.length || 0})`,
              children: (
                <List
                  dataSource={packContent.schemas}
                  renderItem={(schema: any) => (
                    <List.Item>
                      <Typography.Text code>{schema}</Typography.Text>
                    </List.Item>
                  )}
                />
              ),
            },
          ]}
        />
      )}
    </Drawer>
  );
}
