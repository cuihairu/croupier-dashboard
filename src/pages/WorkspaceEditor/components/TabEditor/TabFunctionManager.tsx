import React from 'react';
import {
  Card,
  List,
  Tag,
  Button,
  message,
  Modal,
  Space,
  Typography,
  Popover,
  Descriptions,
  Tooltip,
} from 'antd';
import { DeleteOutlined, EyeOutlined, PlusOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { TabConfig } from '@/types/workspace';
import type { FunctionDescriptor } from '@/services/api/functions';
import { CodeEditor } from '@/components/MonacoDynamic';
import FunctionSelectorModal from '../FunctionSelectorModal';
import {
  recommendFunctions,
  getReasonText,
  getReasonColor,
  type FunctionRecommendation,
} from '../../utils/functionRecommender';

const { Text } = Typography;

/** 函数详情 Popover 内容 */
function FunctionPopoverContent({ descriptor }: { descriptor: FunctionDescriptor }) {
  const inputSchema = descriptor.input_schema
    ? (() => {
        try {
          return JSON.parse(descriptor.input_schema);
        } catch {
          return null;
        }
      })()
    : descriptor.params;
  const outputSchema = descriptor.output_schema
    ? (() => {
        try {
          return JSON.parse(descriptor.output_schema);
        } catch {
          return null;
        }
      })()
    : descriptor.outputs;

  const inputProps = inputSchema?.properties ? Object.keys(inputSchema.properties) : [];
  const outputProps = outputSchema?.properties ? Object.keys(outputSchema.properties) : [];

  return (
    <div style={{ maxWidth: 360 }}>
      <Descriptions column={1} size="small" bordered={false}>
        <Descriptions.Item label="ID">
          <Text code copyable={{ text: descriptor.id }} style={{ fontSize: 12 }}>
            {descriptor.id}
          </Text>
        </Descriptions.Item>
        {descriptor.description && (
          <Descriptions.Item label="描述">{descriptor.description}</Descriptions.Item>
        )}
        {descriptor.entity && (
          <Descriptions.Item label="实体">
            {descriptor.entity_display?.zh || descriptor.entity}
          </Descriptions.Item>
        )}
        {descriptor.operation && (
          <Descriptions.Item label="操作">
            {descriptor.operation_display?.zh || descriptor.operation}
          </Descriptions.Item>
        )}
        {descriptor.tags && descriptor.tags.length > 0 && (
          <Descriptions.Item label="标签">
            {descriptor.tags.map((t) => (
              <Tag key={t} style={{ marginBottom: 2 }}>
                {t}
              </Tag>
            ))}
          </Descriptions.Item>
        )}
        {inputProps.length > 0 && (
          <Descriptions.Item label="输入参数">
            <Space size={[4, 2]} wrap>
              {inputProps.slice(0, 8).map((p) => (
                <Tag key={p} color="blue">
                  {p}
                </Tag>
              ))}
              {inputProps.length > 8 && <Tag>+{inputProps.length - 8}</Tag>}
            </Space>
          </Descriptions.Item>
        )}
        {outputProps.length > 0 && (
          <Descriptions.Item label="输出字段">
            <Space size={[4, 2]} wrap>
              {outputProps.slice(0, 8).map((p) => (
                <Tag key={p} color="green">
                  {p}
                </Tag>
              ))}
              {outputProps.length > 8 && <Tag>+{outputProps.length - 8}</Tag>}
            </Space>
          </Descriptions.Item>
        )}
      </Descriptions>
    </div>
  );
}

export interface TabFunctionManagerProps {
  tab: TabConfig;
  descriptors: FunctionDescriptor[];
  onDrop: (e: React.DragEvent) => void;
  onRemoveFunction: (functionId: string) => void;
  onOpenLayoutWizard: (descriptor: FunctionDescriptor) => void;
  onAddFunctions?: (functionIds: string[]) => void;
}

export default function TabFunctionManager({
  tab,
  descriptors,
  onDrop,
  onRemoveFunction,
  onOpenLayoutWizard,
  onAddFunctions,
}: TabFunctionManagerProps) {
  const [descriptorPreviewOpen, setDescriptorPreviewOpen] = React.useState(false);
  const [previewDescriptor, setPreviewDescriptor] = React.useState<FunctionDescriptor | null>(null);
  const [functionSelectorOpen, setFunctionSelectorOpen] = React.useState(false);

  // 计算推荐函数
  const recommendations = React.useMemo<FunctionRecommendation[]>(() => {
    const existingFunctions = tab.functions || [];
    return recommendFunctions(existingFunctions, descriptors, {
      maxResults: 4,
      excludeExisting: true,
      minScore: 30,
    });
  }, [tab.functions, descriptors]);

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
        extra={
          <Space size={8}>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setFunctionSelectorOpen(true)}
            >
              批量添加
            </Button>
            <span style={{ fontSize: 12, color: '#999' }}>从左侧拖拽函数到这里</span>
          </Space>
        }
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
                    {desc ? (
                      <Popover
                        content={<FunctionPopoverContent descriptor={desc} />}
                        title={desc.display_name?.zh || desc.id}
                        trigger="hover"
                        placement="right"
                        mouseEnterDelay={0.3}
                      >
                        <Tag color="blue" style={{ cursor: 'pointer' }}>
                          {desc.display_name?.zh || funcId}
                        </Tag>
                      </Popover>
                    ) : (
                      <Tag color="blue">{funcId}</Tag>
                    )}
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

      {/* 推荐函数区域 */}
      {recommendations.length > 0 && (
        <Card
          title={
            <Space size={4}>
              <ThunderboltOutlined style={{ color: '#faad14' }} />
              <span>推荐函数</span>
              <Tag color="orange" style={{ fontSize: 11, marginLeft: 4 }}>
                基于已有函数推荐
              </Tag>
            </Space>
          }
          size="small"
          style={{ marginTop: 12 }}
        >
          <List
            size="small"
            dataSource={recommendations}
            renderItem={(rec) => (
              <List.Item
                style={{ padding: '6px 0' }}
                actions={[
                  <Tooltip title={rec.description}>
                    <Button
                      type="link"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        onAddFunctions?.([rec.function.id]);
                        message.success(
                          `已添加 ${rec.function.display_name?.zh || rec.function.id}`,
                        );
                      }}
                    >
                      添加
                    </Button>
                  </Tooltip>,
                ]}
              >
                <Space size={8}>
                  <Tag color={getReasonColor(rec.reason)} style={{ fontSize: 11, margin: 0 }}>
                    {getReasonText(rec.reason)}
                  </Tag>
                  <span style={{ fontSize: 13 }}>
                    {rec.function.display_name?.zh || rec.function.id}
                  </span>
                  <span style={{ fontSize: 11, color: '#999' }}>{rec.function.id}</span>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      )}

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

      <FunctionSelectorModal
        open={functionSelectorOpen}
        functions={descriptors}
        selectedFunctionIds={tab.functions || []}
        onOk={(functionIds) => {
          // 过滤掉已选的函数
          const newFunctionIds = functionIds.filter((id) => !tab.functions?.includes(id));
          if (newFunctionIds.length > 0) {
            onAddFunctions?.(newFunctionIds);
            message.success(`已添加 ${newFunctionIds.length} 个函数`);
          } else {
            message.info('所选函数已存在');
          }
          setFunctionSelectorOpen(false);
        }}
        onCancel={() => setFunctionSelectorOpen(false)}
        title="批量添加函数"
        multiple={true}
      />
    </>
  );
}
