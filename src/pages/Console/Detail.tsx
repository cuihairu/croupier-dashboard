import { useParams } from '@umijs/max';
import { Alert } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import WorkspaceRenderer, { useWorkspaceConfig } from '@/components/WorkspaceRenderer';

export default function ConsoleDetailPage() {
  const params = useParams<{ objectKey: string }>();
  const objectKey = decodeURIComponent(String(params?.objectKey || ''));

  const { config, loading, error } = useWorkspaceConfig(objectKey);

  if (!objectKey) return <Alert type="error" message="对象标识无效" showIcon />;

  return (
    <PageContainer title={config?.title || objectKey}>
      <WorkspaceRenderer config={config} loading={loading} error={error} />
    </PageContainer>
  );
}
