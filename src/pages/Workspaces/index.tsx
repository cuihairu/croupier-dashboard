import { history } from '@umijs/max';
import { Alert, Badge, Button, Card, List, Popconfirm, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { EditOutlined, GlobalOutlined, StopOutlined } from '@ant-design/icons';
import {
  listWorkspaceConfigs,
  publishWorkspaceConfig,
  unpublishWorkspaceConfig,
} from '@/services/workspaceConfig';
import type { WorkspaceConfig } from '@/types/workspace';

export default function WorkspacesIndexPage() {
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<WorkspaceConfig[]>([]);
  const [error, setError] = useState('');
  const [actionKey, setActionKey] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await listWorkspaceConfigs();
      setConfigs(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      setError(err?.message || '加载对象工作台失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const handlePublish = async (objectKey: string) => {
    setActionKey(objectKey);
    try {
      const updated = await publishWorkspaceConfig(objectKey);
      setConfigs((prev) => prev.map((c) => (c.objectKey === objectKey ? updated : c)));
      message.success('发布成功，已出现在控制台菜单');
    } catch (err: any) {
      message.error(err?.message || '发布失败');
    } finally {
      setActionKey('');
    }
  };

  const handleUnpublish = async (objectKey: string) => {
    setActionKey(objectKey);
    try {
      const updated = await unpublishWorkspaceConfig(objectKey);
      setConfigs((prev) => prev.map((c) => (c.objectKey === objectKey ? updated : c)));
      message.success('已取消发布');
    } catch (err: any) {
      message.error(err?.message || '取消发布失败');
    } finally {
      setActionKey('');
    }
  };

  if (loading) return <Card loading />;
  if (error) return <Alert type="error" message={error} showIcon />;
  if (configs.length === 0) return <Alert type="info" message="暂无对象工作台配置" showIcon />;

  return (
    <Card title="对象工作台管理">
      <List
        grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
        dataSource={configs}
        renderItem={(config) => (
          <List.Item>
            <Card
              hoverable
              actions={[
                <Button
                  key="edit"
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() =>
                    history.push(
                      `/system/functions/workspace-editor/${encodeURIComponent(config.objectKey)}`,
                    )
                  }
                >
                  编辑
                </Button>,
                config.published ? (
                  <Popconfirm
                    key="unpublish"
                    title="取消发布后将从控制台菜单移除"
                    onConfirm={() => handleUnpublish(config.objectKey)}
                  >
                    <Button
                      type="link"
                      danger
                      icon={<StopOutlined />}
                      loading={actionKey === config.objectKey}
                    >
                      取消发布
                    </Button>
                  </Popconfirm>
                ) : (
                  <Button
                    key="publish"
                    type="link"
                    icon={<GlobalOutlined />}
                    loading={actionKey === config.objectKey}
                    onClick={() => handlePublish(config.objectKey)}
                  >
                    发布
                  </Button>
                ),
              ]}
            >
              <Card.Meta
                title={
                  <Space>
                    <Typography.Text strong>{config.title}</Typography.Text>
                    {config.published ? (
                      <Badge status="success" text="已发布" />
                    ) : (
                      <Badge status="default" text="草稿" />
                    )}
                  </Space>
                }
                description={
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <Typography.Text type="secondary">{config.description}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {config.objectKey}
                      {config.layout?.tabs ? ` · ${config.layout.tabs.length} 个标签页` : ''}
                    </Typography.Text>
                  </Space>
                }
              />
            </Card>
          </List.Item>
        )}
      />
    </Card>
  );
}
