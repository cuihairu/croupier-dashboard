import React from 'react';
import { Alert, Empty, Spin } from 'antd';

export function RendererLoading({ tip = '加载中...' }: { tip?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '100px 0' }}>
      <Spin size="large" tip={tip} />
    </div>
  );
}

export function RendererEmpty({ description = '暂无数据' }: { description?: string }) {
  return <Empty description={description} style={{ marginTop: 48, marginBottom: 24 }} />;
}

export function RendererError({
  message = '加载失败',
  description,
}: {
  message?: string;
  description: string;
}) {
  return (
    <Alert
      type="error"
      showIcon
      message={message}
      description={description}
      style={{ marginBottom: 16 }}
    />
  );
}
