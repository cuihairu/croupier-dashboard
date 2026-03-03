import React from 'react';
import { Modal, Button, Timeline, Space, Tag, Typography } from 'antd';
import type { VersionHistoryItem } from './usePacksPage';

type Props = {
  open: boolean;
  packName?: string;
  items: VersionHistoryItem[];
  onClose: () => void;
  onRollback: (version: string) => void;
};

export default function VersionHistoryModal({ open, packName, items, onClose, onRollback }: Props) {
  return (
    <Modal
      title={`版本历史 - ${packName}`}
      open={open}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
    >
      <Timeline>
        {items.map((item) => (
          <Timeline.Item
            key={item.id}
            color={item.status === 'stable' ? 'green' : item.status === 'canary' ? 'blue' : 'red'}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Tag color="blue">{item.version}</Tag>
                <Tag
                  color={
                    item.status === 'stable'
                      ? 'success'
                      : item.status === 'canary'
                      ? 'processing'
                      : 'error'
                  }
                >
                  {item.status}
                </Tag>
                {item.status !== 'stable' && (
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    onClick={() => onRollback(item.version)}
                  >
                    回滚到此版本
                  </Button>
                )}
              </Space>
              <Typography.Text>{item.changelog}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                部署者: {item.deployedBy} | 时间:{' '}
                {new Date(item.deployedAt).toLocaleString('zh-CN')}
              </Typography.Text>
            </Space>
          </Timeline.Item>
        ))}
      </Timeline>
    </Modal>
  );
}
