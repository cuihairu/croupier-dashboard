import { history, useParams } from '@umijs/max';
import { Button, Spin, Alert, Empty } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import WorkspaceRenderer, { useWorkspaceConfig } from '@/components/WorkspaceRenderer';

export default function WorkspaceDetailPage() {
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
          onClick={() =>
            history.push(`/system/functions/workspace-editor/${encodeURIComponent(objectKey)}`)
          }
        >
          编辑配置
        </Button>,
      ]}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert type="error" message={error} showIcon />
      ) : !config ? (
        <Empty description="对象不存在或暂无配置" />
      ) : (
        <WorkspaceRenderer config={config} />
      )}
    </PageContainer>
  );
}
