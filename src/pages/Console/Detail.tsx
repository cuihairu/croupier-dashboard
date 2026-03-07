import { useParams } from '@umijs/max';
import { Alert, Button, Result } from 'antd';
import { useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import WorkspaceRenderer, { useWorkspaceConfig } from '@/components/WorkspaceRenderer';
import { trackWorkspaceEvent } from '@/services/workspace/telemetry';

function safeDecodeObjectKey(value: string): { objectKey: string; invalid: boolean } {
  try {
    const decoded = decodeURIComponent(String(value || '')).trim();
    return {
      objectKey: decoded,
      invalid: !decoded,
    };
  } catch {
    return {
      objectKey: '',
      invalid: true,
    };
  }
}

export default function ConsoleDetailPage() {
  const params = useParams<{ objectKey: string }>();
  const { objectKey, invalid } = safeDecodeObjectKey(String(params?.objectKey || ''));

  useEffect(() => {
    trackWorkspaceEvent('workspace_page_open', {
      page: 'console_detail',
      objectKey,
    });
  }, [objectKey]);

  const { config, loading, error, errorCode, reload } = useWorkspaceConfig(objectKey);

  if (invalid) {
    return <Alert type="error" message="对象标识无效" showIcon />;
  }

  if (!loading && errorCode === 'workspace_not_found') {
    return (
      <PageContainer title={objectKey}>
        <Result
          status="404"
          title="配置不存在"
          subTitle="当前对象没有可用的已发布工作台配置。"
        />
      </PageContainer>
    );
  }

  if (!loading && errorCode === 'forbidden') {
    return (
      <PageContainer title={objectKey}>
        <Result
          status="403"
          title="无访问权限"
          subTitle="你没有查看该工作台配置的权限。"
        />
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
    <PageContainer title={config?.title || objectKey}>
      <WorkspaceRenderer config={config} loading={loading} error={error} />
    </PageContainer>
  );
}
