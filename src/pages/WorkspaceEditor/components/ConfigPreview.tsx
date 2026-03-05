/**
 * 配置预览组件
 *
 * 实时预览 Workspace 配置效果。
 *
 * @module pages/WorkspaceEditor/components/ConfigPreview
 */

import React, { useState } from 'react';
import { Card, Tabs, Button, Modal } from 'antd';
import { EyeOutlined, CodeOutlined } from '@ant-design/icons';
import type { WorkspaceConfig } from '@/types/workspace';
import WorkspaceRenderer from '@/components/WorkspaceRenderer';

export interface ConfigPreviewProps {
  /** Workspace 配置 */
  config: WorkspaceConfig | null;
}

/**
 * 配置预览组件
 */
export default function ConfigPreview({ config }: ConfigPreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [showFullPreview, setShowFullPreview] = useState(false);

  if (!config) {
    return (
      <Card title="预览" style={{ height: 'calc(100vh - 200px)' }}>
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无配置</div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="预览"
        style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
        extra={
          <Tabs
            activeKey={viewMode}
            onChange={(key) => setViewMode(key as any)}
            size="small"
            items={[
              {
                key: 'preview',
                label: (
                  <>
                    <EyeOutlined /> 预览
                  </>
                ),
              },
              {
                key: 'code',
                label: (
                  <>
                    <CodeOutlined /> 代码
                  </>
                ),
              },
            ]}
          />
        }
      >
        {viewMode === 'preview' ? (
          <div>
            <div
              style={{
                border: '1px solid #f0f0f0',
                padding: 16,
                minHeight: 300,
                backgroundColor: '#fff',
                borderRadius: 4,
              }}
            >
              <WorkspaceRenderer config={config} />
            </div>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Button type="link" onClick={() => setShowFullPreview(true)}>
                全屏预览
              </Button>
            </div>
          </div>
        ) : (
          <pre
            style={{
              backgroundColor: '#f5f5f5',
              padding: 16,
              borderRadius: 4,
              overflow: 'auto',
              maxHeight: 'calc(100vh - 350px)',
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            {JSON.stringify(config, null, 2)}
          </pre>
        )}
      </Card>

      {/* 全屏预览模态框 */}
      <Modal
        title="全屏预览"
        open={showFullPreview}
        onCancel={() => setShowFullPreview(false)}
        footer={null}
        width="90%"
        style={{ top: 20 }}
        bodyStyle={{ height: 'calc(100vh - 150px)', overflow: 'auto' }}
      >
        <WorkspaceRenderer config={config} />
      </Modal>
    </>
  );
}
