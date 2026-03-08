/**
 * 配置预览组件
 *
 * 实时预览 Workspace 配置效果。
 *
 * @module pages/WorkspaceEditor/components/ConfigPreview
 */

import React, { useState } from 'react';
import { Card, Tabs, Button, Modal, Segmented, Space } from 'antd';
import { EyeOutlined, CodeOutlined } from '@ant-design/icons';
import type { WorkspaceConfig } from '@/types/workspace';
import WorkspaceRenderer from '@/components/WorkspaceRenderer';
import { CodeEditor } from '@/components/MonacoDynamic';

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
  const [previewDataMode, setPreviewDataMode] = useState<'mock' | 'live'>('mock');

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
          <Space size={8}>
            {viewMode === 'preview' && (
              <Segmented
                size="small"
                value={previewDataMode}
                onChange={(v) => setPreviewDataMode(v as 'mock' | 'live')}
                options={[
                  { label: '示例数据', value: 'mock' },
                  { label: '真实数据', value: 'live' },
                ]}
              />
            )}
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
          </Space>
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
              <WorkspaceRenderer
                config={config}
                context={previewDataMode === 'mock' ? { templatePreview: true } : undefined}
              />
            </div>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Button type="link" onClick={() => setShowFullPreview(true)}>
                全屏预览
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ border: '1px solid #f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
            <CodeEditor
              value={JSON.stringify(config, null, 2)}
              language="json"
              height={480}
              readOnly
              options={{
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                minimap: { enabled: false },
              }}
            />
          </div>
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
        styles={{ body: { height: 'calc(100vh - 150px)', overflow: 'auto' } }}
      >
        <WorkspaceRenderer
          config={config}
          context={previewDataMode === 'mock' ? { templatePreview: true } : undefined}
        />
      </Modal>
    </>
  );
}
