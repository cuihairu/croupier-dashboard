import React from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
} from 'antd';
import type { FormInstance } from 'antd/es/form';
import FunctionUIManager from '@/components/FunctionUIManager';
import { JsonViewer } from './DetailSections';

type RoutePreview = {
  nodes?: string[];
  path?: string;
};

export type ConfigTabProps = {
  functionId: string;
  activeSubTab: string;
  onSubTabChange: (key: string) => void;
  jsonViewData: {
    descriptor_from_detail_api?: any;
    descriptor_from_index_api?: any;
    openapi_operation?: any;
    route?: any;
  };
  onJsonCopySuccess: () => void;
  onJsonCopyError: () => void;
  uiDescriptor: any;
  parsedInputSchema: any;
  onSaveUi: (uiConfig: any) => Promise<void>;
  routePreview: RoutePreview;
  routeConfigForm: FormInstance;
  routeConfigSaving: boolean;
  onSaveRoute: () => Promise<void>;
  onResetRoute: () => Promise<void>;
  onOpenAssignments: () => void;
};

export default function DetailConfigTab({
  functionId,
  activeSubTab,
  onSubTabChange,
  jsonViewData,
  onJsonCopySuccess,
  onJsonCopyError,
  uiDescriptor,
  parsedInputSchema,
  onSaveUi,
  routePreview,
  routeConfigForm,
  routeConfigSaving,
  onSaveRoute,
  onResetRoute,
  onOpenAssignments,
}: ConfigTabProps) {
  const jsonTabItems = [
    {
      key: 'json-detail',
      label: 'Detail API',
      children: (
        <JsonViewer
          data={jsonViewData.descriptor_from_detail_api || {}}
          onCopySuccess={onJsonCopySuccess}
          onCopyError={onJsonCopyError}
        />
      ),
    },
    {
      key: 'json-index',
      label: 'Descriptor Index',
      children: (
        <JsonViewer
          data={jsonViewData.descriptor_from_index_api || {}}
          onCopySuccess={onJsonCopySuccess}
          onCopyError={onJsonCopyError}
        />
      ),
    },
    {
      key: 'json-openapi',
      label: 'OpenAPI',
      children: (
        <JsonViewer
          data={jsonViewData.openapi_operation || {}}
          onCopySuccess={onJsonCopySuccess}
          onCopyError={onJsonCopyError}
        />
      ),
    },
    {
      key: 'json-route',
      label: 'Route',
      children: (
        <JsonViewer
          data={jsonViewData.route || {}}
          onCopySuccess={onJsonCopySuccess}
          onCopyError={onJsonCopyError}
        />
      ),
    },
  ];

  const configTabItems = [
    {
      key: 'json',
      label: 'JSON 视图',
      children: (
        <>
          <Alert
            message="配置信息"
            description="按来源拆分查看：详情接口、描述符索引、OpenAPI、路由（只读）"
            type="info"
            showIcon
          />
          <Tabs style={{ marginTop: 16 }} type="card" size="small" items={jsonTabItems} />
        </>
      ),
    },
    {
      key: 'ui',
      label: '🎨 UI 配置',
      children: (
        <FunctionUIManager
          functionId={functionId}
          descriptor={uiDescriptor}
          jsonSchema={parsedInputSchema}
          onSave={onSaveUi}
        />
      ),
    },
    {
      key: 'route',
      label: '🛣️ 路由配置',
      children: (
        <>
          <Alert
            message="路由配置"
            description="配置函数在前端菜单中的显示和跳转路径（需要重新打包 Pack 生效）"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space wrap>
              {Array.isArray(routePreview?.nodes) && routePreview.nodes.length > 0 ? (
                routePreview.nodes.map((node: string) => (
                  <Tag key={node} color="blue">
                    {node}
                  </Tag>
                ))
              ) : (
                <Tag color="default">未设置菜单节点（将自动推导）</Tag>
              )}
              <Tag color="geekblue">{routePreview?.path || '自动生成默认路径'}</Tag>
              <Button size="small" onClick={onOpenAssignments}>
                去分配页查看展示
              </Button>
            </Space>
          </Card>
          <Card title="菜单配置" size="small">
            <Form form={routeConfigForm} layout="vertical">
              <Form.Item
                label="菜单节点（nodes）"
                name="nodes"
                tooltip="英文 key 数组（任意层级），例如：game / player；为空时自动推导"
              >
                <Select
                  mode="tags"
                  tokenSeparators={[',', '/', ' ']}
                  placeholder="输入英文节点，回车添加"
                />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="路由路径"
                    name="path"
                    tooltip="可留空，由系统根据 entity/function 自动生成"
                  >
                    <Input placeholder="留空自动生成默认路径" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="显示顺序" name="order" tooltip="数字越小越靠前">
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="隐藏菜单" name="hidden" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
              <Alert
                message="提示"
                description="路由配置会保存到服务端，并用于函数菜单分组与跳转展示。"
                type="info"
                showIcon
              />
              <Space style={{ marginTop: 16 }}>
                <Button type="primary" loading={routeConfigSaving} onClick={onSaveRoute}>
                  保存路由配置
                </Button>
                <Button onClick={onResetRoute}>恢复默认</Button>
              </Space>
            </Form>
          </Card>
        </>
      ),
    },
  ];

  return (
    <Tabs
      activeKey={activeSubTab}
      onChange={onSubTabChange}
      type="card"
      size="small"
      items={configTabItems}
    />
  );
}
