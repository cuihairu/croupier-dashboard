import { history, useAccess, useParams } from '@umijs/max';
import { Button, Alert, Modal, Tooltip, message, Result } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import WorkspaceRenderer, { useWorkspaceConfig } from '@/components/WorkspaceRenderer';
import { deleteWorkspaceConfig } from '@/services/workspaceConfig';
import { trackWorkspaceEvent } from '@/services/workspace/telemetry';
import { getWorkspaceErrorMessage } from '@/services/workspace/errors';

export default function WorkspaceDetailPage() {
  const access = useAccess() as any;
  const params = useParams<{ objectKey: string }>();
  const objectKey = decodeURIComponent(String(params?.objectKey || ''));

  const { config, loading, error, errorCode, reload } = useWorkspaceConfig(objectKey);
  const canEdit = Boolean(access?.canWorkspaceEdit);
  const canDelete = Boolean(access?.canWorkspaceDelete);

  const handleDelete = () => {
    if (!canDelete) {
      message.error('无删除权限');
      return;
    }
    Modal.confirm({
      title: '确认删除',
      content: (
        <div>
          <div>{`对象: ${objectKey}`}</div>
          <div>{`标题: ${config?.title || '-'}`}</div>
          <div style={{ marginTop: 8, color: '#cf1322' }}>删除后不可恢复，请谨慎操作。</div>
        </div>
      ),
      okButtonProps: { danger: true },
      okText: '确认删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteWorkspaceConfig(objectKey);
          trackWorkspaceEvent('workspace_delete', { objectKey, scope: 'workspaces_detail' });
          message.success('删除成功');
          history.push('/system/functions/workspaces');
        } catch (err: any) {
          trackWorkspaceEvent('workspace_delete_error', {
            objectKey,
            scope: 'workspaces_detail',
            error: err?.message || String(err),
          });
          message.error(getWorkspaceErrorMessage(err, '删除失败'));
        }
      },
    });
  };

  if (!objectKey) {
    return <Alert type="error" message="对象标识无效" showIcon />;
  }

  if (!canEdit && !canDelete && !access?.canWorkspaceRead) {
    return <Result status="403" title="无访问权限" subTitle="你没有查看该对象工作台的权限。" />;
  }

  if (!loading && errorCode === 'workspace_not_found') {
    return (
      <PageContainer title={objectKey}>
        <Result status="404" title="配置不存在" subTitle="当前对象没有可用的工作台配置。" />
      </PageContainer>
    );
  }

  if (!loading && errorCode === 'forbidden') {
    return (
      <PageContainer title={objectKey}>
        <Result status="403" title="无访问权限" subTitle="你没有查看该工作台配置的权限。" />
      </PageContainer>
    );
  }

  if (!loading && errorCode && errorCode !== 'unknown') {
    return (
      <PageContainer title={objectKey}>
        <Result
          status="warning"
          title="加载失败"
          subTitle={error || '工作台加载失败，请稍后重试。'}
          extra={
            <Button type="primary" onClick={reload}>
              重试
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={config?.title || objectKey}
      extra={[
        <Tooltip key="edit" title={canEdit ? '' : '无编辑权限'}>
          <span>
            <Button
              icon={<EditOutlined />}
              disabled={!canEdit}
              onClick={() =>
                history.push(`/system/functions/workspace-editor/${encodeURIComponent(objectKey)}`)
              }
            >
              编辑配置
            </Button>
          </span>
        </Tooltip>,
        <Tooltip key="delete" title={canDelete ? '' : '无删除权限'}>
          <span>
            <Button danger icon={<DeleteOutlined />} disabled={!canDelete} onClick={handleDelete}>
              删除配置
            </Button>
          </span>
        </Tooltip>,
      ]}
    >
      <WorkspaceRenderer config={config} loading={loading} error={error} />
    </PageContainer>
  );
}
