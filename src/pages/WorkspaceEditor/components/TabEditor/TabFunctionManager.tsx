import React from 'react';
import { Card, List, Tag, Button, message, Modal, Space, Typography } from 'antd';
import { DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { TabConfig } from '@/types/workspace';
import type { FunctionDescriptor } from '@/services/api/functions';
import { CodeEditor } from '@/components/MonacoDynamic';

const { Text } = Typography;

export interface TabFunctionManagerProps {
  tab: TabConfig;
  descriptors: FunctionDescriptor[];
  onDrop: (e: React.DragEvent) => void;
  onRemoveFunction: (functionId: string) => void;
  onOpenLayoutWizard: (descriptor: FunctionDescriptor) => void;
}

export default function TabFunctionManager({
  tab,
  descriptors,
  onDrop,
  onRemoveFunction,
  onOpenLayoutWizard,
}: TabFunctionManagerProps) {
  const [descriptorPreviewOpen, setDescriptorPreviewOpen] = React.useState(false);
  const [previewDescriptor, setPreviewDescriptor] = React.useState<FunctionDescriptor | null>(null);

  const handlePreviewFunctionJson = (functionId: string) => {
    const descriptor = descriptors.find((d) => d.id === functionId);
    if (!descriptor) {
      message.warning('未找到函数描述符');
      return;
    }
    setPreviewDescriptor(descriptor);
    setDescriptorPreviewOpen(true);
  };

  const beforeMountJsonEditor = (monaco: any) => {
    if (!monaco?.editor || monaco.editor.getTheme?.() === 'sublime-monokai') return;
    monaco.editor.defineTheme('sublime-monokai', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '66D9EF' },
        { token: 'string.value.json', foreground: 'A6E22E' },
        { token: 'number', foreground: 'E6DB74' },
        { token: 'keyword', foreground: 'F92672' },
      ],
      colors: {
        'editor.background': '#272822',
        'editorLineNumber.foreground': '#75715E',
        'editorLineNumber.activeForeground': '#F8F8F2',
      },
    });
  };

  return (
    <>
      <Card
        title="使用的函数"
        size="small"
        extra={<span style={{ fontSize: 12, color: '#999' }}>从左侧拖拽函数到这里</span>}
      >
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            minHeight: 80,
            border: '2px dashed #d9d9d9',
            borderRadius: 4,
            padding: 12,
            backgroundColor: '#fafafa',
          }}
        >
          {tab.functions && tab.functions.length > 0 ? (
            <List
              size="small"
              dataSource={tab.functions}
              renderItem={(funcId) => {
                const desc = descriptors.find((d) => d.id === funcId);
                return (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handlePreviewFunctionJson(funcId)}
                      >
                        查看 JSON
                      </Button>,
                      <Button
                        type="link"
                        size="small"
                        onClick={() => {
                          const d = descriptors.find((x) => x.id === funcId);
                          if (!d) {
                            message.warning('未找到函数描述符');
                            return;
                          }
                          onOpenLayoutWizard(d);
                        }}
                      >
                        界面向导
                      </Button>,
                      <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => onRemoveFunction(funcId)}
                      />,
                    ]}
                  >
                    <Tag color="blue">{desc?.display_name?.zh || funcId}</Tag>
                    <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>{funcId}</span>
                  </List.Item>
                );
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: '8px 0' }}>
              拖拽函数到这里
            </div>
          )}
        </div>
      </Card>

      <Modal
        title="函数 JSON 预览"
        open={descriptorPreviewOpen}
        footer={null}
        width={860}
        onCancel={() => {
          setDescriptorPreviewOpen(false);
          setPreviewDescriptor(null);
        }}
      >
        {previewDescriptor ? (
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Text strong>{previewDescriptor.id}</Text>
            <Text type="secondary">
              {previewDescriptor.display_name?.zh ||
                previewDescriptor.display_name?.en ||
                previewDescriptor.id}
            </Text>
            <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
              <CodeEditor
                value={JSON.stringify(previewDescriptor, null, 2)}
                language="json"
                height={500}
                readOnly
                theme="sublime-monokai"
                beforeMount={beforeMountJsonEditor}
                options={{
                  lineNumbers: 'on',
                  renderLineHighlight: 'line',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  minimap: { enabled: false },
                }}
              />
            </div>
          </Space>
        ) : null}
      </Modal>
    </>
  );
}
