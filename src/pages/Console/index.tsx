import { history } from '@umijs/max';
import { Alert, Card, List, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { AppstoreOutlined } from '@ant-design/icons';
import { listPublishedWorkspaceConfigs } from '@/services/workspaceConfig';
import type { WorkspaceConfig } from '@/types/workspace';

export default function ConsolePage() {
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<WorkspaceConfig[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await listPublishedWorkspaceConfigs();
        if (!mounted) return;
        setConfigs(Array.isArray(rows) ? rows : []);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || '加载控制台失败');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load().catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <Card loading />;
  if (error) return <Alert type="error" message={error} showIcon />;
  if (configs.length === 0) return <Alert type="info" message="暂无已发布的工作台" showIcon />;

  return (
    <Card title="控制台">
      <List
        grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
        dataSource={configs}
        renderItem={(config) => (
          <List.Item>
            <Card
              hoverable
              onClick={() => history.push(`/console/${encodeURIComponent(config.objectKey)}`)}
            >
              <Card.Meta
                avatar={<AppstoreOutlined style={{ fontSize: 24, color: '#1677ff' }} />}
                title={<Typography.Text strong>{config.title}</Typography.Text>}
                description={
                  <Space direction="vertical" size={2}>
                    <Typography.Text type="secondary">{config.description}</Typography.Text>
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
