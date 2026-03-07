import { history, useAccess } from '@umijs/max';
import {
  Alert,
  Badge,
  Button,
  Card,
  List,
  Space,
  Tooltip,
  Typography,
  message,
  Input,
  Select,
  Modal,
  Result,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { DeleteOutlined, EditOutlined, GlobalOutlined, StopOutlined } from '@ant-design/icons';
import {
  deleteWorkspaceConfig,
  listWorkspaceVersions,
  listWorkspaceConfigs,
  publishWorkspaceConfig,
  unpublishWorkspaceConfig,
} from '@/services/workspaceConfig';
import type { WorkspaceConfig } from '@/types/workspace';
import { trackWorkspaceEvent } from '@/services/workspace/telemetry';
import {
  getWorkspaceErrorMessage,
  parseWorkspaceError,
  type WorkspaceErrorCode,
} from '@/services/workspace/errors';

function resolveWorkspaceStatus(config: WorkspaceConfig): 'draft' | 'published' | 'archived' {
  if (config.status) return config.status;
  return config.published ? 'published' : 'draft';
}

function buildPublishChangeSummary(
  draftConfig?: WorkspaceConfig,
  publishedConfig?: WorkspaceConfig,
): string {
  if (!draftConfig) return '缺少当前草稿配置';
  if (!publishedConfig) return '当前无已发布版本，本次发布将作为首个发布版本';

  const changes: string[] = [];
  if ((draftConfig.title || '') !== (publishedConfig.title || '')) {
    changes.push('标题已变更');
  }
  if ((draftConfig.description || '') !== (publishedConfig.description || '')) {
    changes.push('描述已变更');
  }
  if ((draftConfig.layout?.type || '-') !== (publishedConfig.layout?.type || '-')) {
    changes.push(
      `布局 ${publishedConfig.layout?.type || '-'} -> ${draftConfig.layout?.type || '-'}`,
    );
  }
  const draftTabs = draftConfig.layout?.tabs?.length || 0;
  const publishedTabs = publishedConfig.layout?.tabs?.length || 0;
  if (draftTabs !== publishedTabs) {
    changes.push(`标签页数 ${publishedTabs} -> ${draftTabs}`);
  }
  return changes.length > 0 ? changes.join('；') : '与当前发布版本结构一致';
}

export default function WorkspacesIndexPage() {
  const access = useAccess() as any;
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<WorkspaceConfig[]>([]);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<WorkspaceErrorCode | undefined>();
  const [actionKey, setActionKey] = useState('');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>(
    'all',
  );
  const [sortBy, setSortBy] = useState<'updated_desc' | 'title_asc'>('updated_desc');

  const load = async () => {
    setLoading(true);
    setError('');
    setErrorCode(undefined);
    try {
      const rows = await listWorkspaceConfigs();
      trackWorkspaceEvent('workspace_load', {
        scope: 'workspaces_page',
        count: Array.isArray(rows) ? rows.length : 0,
      });
      setConfigs(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      const parsedError = parseWorkspaceError(err);
      trackWorkspaceEvent('workspace_load_error', {
        scope: 'workspaces_page',
        error: err?.message || String(err),
        code: parsedError.code,
      });
      setErrorCode(parsedError.code);
      setError(getWorkspaceErrorMessage(err, '加载对象工作台失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    trackWorkspaceEvent('workspace_page_open', {
      page: 'workspaces_index',
    });
    load().catch(() => {});
  }, []);

  const visibleConfigs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const filtered = configs.filter((config) => {
      const status = resolveWorkspaceStatus(config);
      if (statusFilter === 'published' && status !== 'published') return false;
      if (statusFilter === 'draft' && status !== 'draft') return false;
      if (statusFilter === 'archived' && status !== 'archived') return false;

      if (!normalizedKeyword) return true;
      const title = (config.title || '').toLowerCase();
      const objectKey = (config.objectKey || '').toLowerCase();
      const description = (config.description || '').toLowerCase();
      return (
        title.includes(normalizedKeyword) ||
        objectKey.includes(normalizedKeyword) ||
        description.includes(normalizedKeyword)
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
  }, [configs, keyword, statusFilter, sortBy]);

  const handlePublish = async (objectKey: string) => {
    if (!access?.canWorkspacePublish) {
      message.error('无发布权限');
      return;
    }
    const target = configs.find((item) => item.objectKey === objectKey);
    let publishChangeSummary = '发布后会在控制台向有权限用户可见。';
    try {
      const versions = await listWorkspaceVersions(objectKey);
      const currentPublished = versions.find((item) => item.isCurrentPublished)?.config;
      publishChangeSummary = buildPublishChangeSummary(target, currentPublished);
    } catch {
      publishChangeSummary = '版本差异摘要暂不可用，本次将按当前草稿发布。';
    }
    Modal.confirm({
      title: '确认发布',
      content: (
        <div>
          <div>{`对象: ${target?.objectKey || objectKey}`}</div>
          <div>{`标题: ${target?.title || '-'}`}</div>
          <div>{`标签页数: ${target?.layout?.tabs?.length || 0}`}</div>
          <div>{`变更摘要: ${publishChangeSummary}`}</div>
          <div style={{ marginTop: 8, color: '#cf1322' }}>发布后会在控制台向有权限用户可见。</div>
        </div>
      ),
      onOk: async () => {
        setActionKey(objectKey);
        try {
          await publishWorkspaceConfig(objectKey);
          trackWorkspaceEvent('workspace_publish', { objectKey });
          await load();
          message.success('发布成功，已出现在控制台菜单');
        } catch (err: any) {
          trackWorkspaceEvent('workspace_publish_error', {
            objectKey,
            error: err?.message || String(err),
          });
          message.error(getWorkspaceErrorMessage(err, '发布失败'));
        } finally {
          setActionKey('');
        }
      },
    });
  };

  const handleUnpublish = async (objectKey: string) => {
    if (!access?.canWorkspacePublish) {
      message.error('无发布权限');
      return;
    }
    const target = configs.find((item) => item.objectKey === objectKey);
    Modal.confirm({
      title: '确认取消发布',
      content: (
        <div>
          <div>{`对象: ${target?.objectKey || objectKey}`}</div>
          <div>{`标题: ${target?.title || '-'}`}</div>
          <div style={{ marginTop: 8, color: '#cf1322' }}>取消发布后将从控制台菜单移除。</div>
        </div>
      ),
      onOk: async () => {
        setActionKey(objectKey);
        try {
          await unpublishWorkspaceConfig(objectKey);
          trackWorkspaceEvent('workspace_unpublish', { objectKey });
          await load();
          message.success('已取消发布');
        } catch (err: any) {
          trackWorkspaceEvent('workspace_unpublish_error', {
            objectKey,
            error: err?.message || String(err),
          });
          message.error(getWorkspaceErrorMessage(err, '取消发布失败'));
        } finally {
          setActionKey('');
        }
      },
    });
  };

  const handleDelete = async (objectKey: string) => {
    if (!access?.canWorkspaceDelete) {
      message.error('无删除权限');
      return;
    }
    const target = configs.find((item) => item.objectKey === objectKey);
    const targetStatus = target ? resolveWorkspaceStatus(target) : '-';
    Modal.confirm({
      title: '确认删除',
      content: (
        <div>
          <div>{`对象: ${target?.objectKey || objectKey}`}</div>
          <div>{`标题: ${target?.title || '-'}`}</div>
          <div>{`状态: ${targetStatus}`}</div>
          <div style={{ marginTop: 8, color: '#cf1322' }}>删除后不可恢复，请谨慎操作。</div>
        </div>
      ),
      okButtonProps: { danger: true },
      okText: '确认删除',
      cancelText: '取消',
      onOk: async () => {
        setActionKey(objectKey);
        try {
          await deleteWorkspaceConfig(objectKey);
          trackWorkspaceEvent('workspace_delete', { objectKey });
          await load();
          message.success('删除成功');
        } catch (err: any) {
          trackWorkspaceEvent('workspace_delete_error', {
            objectKey,
            error: err?.message || String(err),
          });
          message.error(getWorkspaceErrorMessage(err, '删除失败'));
        } finally {
          setActionKey('');
        }
      },
    });
  };

  if (!access?.canWorkspaceRead) {
    return <Result status="403" title="无访问权限" subTitle="你没有查看对象工作台的权限。" />;
  }
  if (loading) return <Card loading />;
  if (errorCode === 'forbidden') {
    return <Result status="403" title="无访问权限" subTitle="你没有查看对象工作台的权限。" />;
  }
  if (error) return <Alert type="error" message={error} showIcon />;
  if (configs.length === 0) return <Alert type="info" message="暂无对象工作台配置" showIcon />;

  return (
    <Card title="对象工作台管理">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          allowClear
          placeholder="搜索标题 / objectKey / 描述"
          style={{ width: 320 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          style={{ width: 150 }}
          options={[
            { label: '全部状态', value: 'all' },
            { label: '已发布', value: 'published' },
            { label: '草稿', value: 'draft' },
            { label: '已归档', value: 'archived' },
          ]}
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
          message="没有匹配的工作台"
          description="请调整筛选条件或搜索关键字。"
        />
      )}

      <List
        grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
        dataSource={visibleConfigs}
        renderItem={(config) => {
          const status = resolveWorkspaceStatus(config);
          const isArchived = status === 'archived';
          const editDisabledReason = !access?.canWorkspaceEdit
            ? '无编辑权限'
            : isArchived
            ? '归档状态不允许编辑'
            : '';
          const publishDisabledReason = !access?.canWorkspacePublish
            ? '无发布权限'
            : isArchived
            ? '归档状态不允许发布操作'
            : '';
          const deleteDisabledReason = !access?.canWorkspaceDelete ? '无删除权限' : '';
          const statusBadge =
            status === 'published'
              ? { status: 'success' as const, text: '已发布' }
              : status === 'archived'
              ? { status: 'warning' as const, text: '已归档' }
              : { status: 'default' as const, text: '草稿' };
          return (
            <List.Item>
              <Card
                hoverable
                actions={[
                  <Tooltip key="edit" title={editDisabledReason}>
                    <span>
                      <Button
                        type="link"
                        icon={<EditOutlined />}
                        disabled={Boolean(editDisabledReason)}
                        onClick={() =>
                          history.push(
                            `/system/functions/workspace-editor/${encodeURIComponent(
                              config.objectKey,
                            )}`,
                          )
                        }
                      >
                        编辑
                      </Button>
                    </span>
                  </Tooltip>,
                  config.published ? (
                    <Tooltip key="unpublish" title={publishDisabledReason}>
                      <span>
                        <Button
                          type="link"
                          danger
                          icon={<StopOutlined />}
                          disabled={Boolean(publishDisabledReason)}
                          loading={actionKey === config.objectKey}
                          onClick={() => handleUnpublish(config.objectKey)}
                        >
                          取消发布
                        </Button>
                      </span>
                    </Tooltip>
                  ) : (
                    <Tooltip key="publish" title={publishDisabledReason}>
                      <span>
                        <Button
                          type="link"
                          icon={<GlobalOutlined />}
                          disabled={Boolean(publishDisabledReason)}
                          loading={actionKey === config.objectKey}
                          onClick={() => handlePublish(config.objectKey)}
                        >
                          发布
                        </Button>
                      </span>
                    </Tooltip>
                  ),
                  <Tooltip key="delete" title={deleteDisabledReason}>
                    <span>
                      <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={Boolean(deleteDisabledReason)}
                        loading={actionKey === config.objectKey}
                        onClick={() => handleDelete(config.objectKey)}
                      >
                        删除
                      </Button>
                    </span>
                  </Tooltip>,
                ]}
              >
                <Card.Meta
                  title={
                    <Space>
                      <Typography.Text strong>{config.title}</Typography.Text>
                      <Badge status={statusBadge.status} text={statusBadge.text} />
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      <Typography.Text type="secondary">{config.description}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {config.objectKey}
                        {typeof config.version === 'number' ? ` · v${config.version}` : ''}
                        {config.layout?.tabs ? ` · ${config.layout.tabs.length} 个标签页` : ''}
                        {config.meta?.updatedAt
                          ? ` · 更新于 ${new Date(config.meta.updatedAt).toLocaleString('zh-CN')}`
                          : ''}
                      </Typography.Text>
                    </Space>
                  }
                />
              </Card>
            </List.Item>
          );
        }}
      />
    </Card>
  );
}
