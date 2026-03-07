import { history, useAccess } from '@umijs/max';
import { Alert, Card, List, Space, Typography, Input, Select, Result } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { AppstoreOutlined } from '@ant-design/icons';
import { listPublishedWorkspaceConfigs } from '@/services/workspaceConfig';
import type { WorkspaceConfig } from '@/types/workspace';
import { trackWorkspaceEvent } from '@/services/workspace/telemetry';
import {
  getWorkspaceErrorMessage,
  parseWorkspaceError,
  type WorkspaceErrorCode,
} from '@/services/workspace/errors';

export default function ConsolePage() {
  const access = useAccess() as any;
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<WorkspaceConfig[]>([]);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<WorkspaceErrorCode | undefined>();
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState<'updated_desc' | 'title_asc'>('updated_desc');

  useEffect(() => {
    let mounted = true;
    trackWorkspaceEvent('workspace_page_open', {
      page: 'console_index',
    });
    const load = async () => {
      setLoading(true);
      setError('');
      setErrorCode(undefined);
      try {
        const rows = await listPublishedWorkspaceConfigs();
        trackWorkspaceEvent('workspace_load', {
          scope: 'console_index',
          count: Array.isArray(rows) ? rows.length : 0,
        });
        if (!mounted) return;
        setConfigs(Array.isArray(rows) ? rows : []);
      } catch (err: any) {
        trackWorkspaceEvent('workspace_load_error', {
          scope: 'console_index',
          error: err?.message || String(err),
        });
        if (!mounted) return;
        const parsedError = parseWorkspaceError(err);
        setErrorCode(parsedError.code);
        setError(getWorkspaceErrorMessage(err, '加载控制台失败'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load().catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const visibleConfigs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const filtered = configs.filter((config) => {
      if (!normalizedKeyword) return true;
      return (
        (config.title || '').toLowerCase().includes(normalizedKeyword) ||
        (config.objectKey || '').toLowerCase().includes(normalizedKeyword) ||
        (config.description || '').toLowerCase().includes(normalizedKeyword)
      );
    });

    const sortable = [...filtered];
    if (sortBy === 'title_asc') {
      sortable.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      return sortable;
    }

    sortable.sort((a, b) => {
      const aTime = new Date(a.meta?.updatedAt || 0).getTime();
      const bTime = new Date(b.meta?.updatedAt || 0).getTime();
      return bTime - aTime;
    });
    return sortable;
  }, [configs, keyword, sortBy]);

  if (!access?.canWorkspaceRead) {
    return <Result status="403" title="无访问权限" subTitle="你没有查看控制台工作台的权限。" />;
  }
  if (loading) return <Card loading />;
  if (errorCode === 'forbidden') {
    return <Result status="403" title="无访问权限" subTitle="你没有查看控制台工作台的权限。" />;
  }
  if (error) return <Alert type="error" message={error} showIcon />;
  if (configs.length === 0) return <Alert type="info" message="暂无已发布的工作台" showIcon />;

  return (
    <Card title="控制台">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          allowClear
          placeholder="搜索标题 / objectKey / 描述"
          style={{ width: 320 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          value={sortBy}
          onChange={(val) => setSortBy(val)}
          style={{ width: 180 }}
          options={[
            { label: '按更新时间降序', value: 'updated_desc' },
            { label: '按标题升序', value: 'title_asc' },
          ]}
        />
      </Space>

      {visibleConfigs.length === 0 && (
        <Alert
          style={{ marginBottom: 16 }}
          type="info"
          showIcon
          message="没有匹配的已发布工作台"
          description="请调整搜索关键字。"
        />
      )}

      <List
        grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
        dataSource={visibleConfigs}
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
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {config.objectKey}
                      {typeof config.version === 'number' ? ` · v${config.version}` : ''}
                      {config.meta?.updatedAt
                        ? ` · 更新于 ${new Date(config.meta.updatedAt).toLocaleString('zh-CN')}`
                        : ''}
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
