import { history, useAccess, useParams } from '@umijs/max';
import { Button, Alert } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import WorkspaceRenderer, { useWorkspaceConfig } from '@/components/WorkspaceRenderer';

export default function WorkspaceDetailPage() {
  const access = useAccess() as any;
  const params = useParams<{ objectKey: string }>();
  const objectKey = decodeURIComponent(String(params?.objectKey || ''));

  const { config, loading, error } = useWorkspaceConfig(objectKey);

  if (!objectKey) {
    return <Alert type="error" message="对象标识无效" showIcon />;
  }

  return (
    <PageContainer
      title={config?.title || objectKey}
      extra={[
        <Button
          key="edit"
          icon={<EditOutlined />}
          disabled={!access?.canWorkspaceEdit}
          onClick={() =>
            history.push(`/system/functions/workspace-editor/${encodeURIComponent(objectKey)}`)
          }
        >
          编辑配置
        </Button>,
      ]}
    >
      <WorkspaceRenderer config={config} loading={loading} error={error} />
    </PageContainer>
  );
}
