import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tabs,
  Table,
  Tag,
  Switch,
  Input,
  InputNumber,
  Form,
  Divider,
  Timeline,
  Alert,
  Badge,
  Row,
  Col,
  Statistic,
  Modal,
  Select
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  SaveOutlined,
  SettingOutlined,
  HistoryOutlined,
  BarChartOutlined,
  CheckOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import FunctionUIManager from '@/components/FunctionUIManager';
import { useParams, history, useLocation } from '@umijs/max';
import { useIntl } from '@umijs/max';
import { App } from 'antd';
// Force rebuild - cache bust 2025-02-10 v3 - DEBUG: NEW CODE
console.log('[DETAIL] Loading updated Detail.tsx with runtime function support');
import {
  getFunctionDetail,
  updateFunction,
  getFunctionHistory,
  getFunctionAnalytics,
  deleteFunction,
  copyFunction,
  getFunctionPermissions,
  updateFunctionPermissions,
  fetchFunctionUiSchema,
  saveFunctionUiSchema,
  listDescriptors,
  type FunctionPermission
} from '@/services/api/functions';

const { TabPane } = Tabs;
const { TextArea } = Input;

interface FunctionDetail {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  version?: string;
  enabled: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  provider?: string;
  agentCount?: number;
  health?: 'healthy' | 'unhealthy' | 'unknown';
  descriptor?: any;
  permissions?: any;
  config?: any;
}

interface HistoryRecord {
  id: string;
  action: string;
  operator?: string;
  timestamp: string;
  details?: any;
}

interface AnalyticsData {
  totalCalls: number;
  successRate: number;
  avgLatency: number;
  callsToday: number;
  callsThisWeek: number;
  callsThisMonth: number;
}

export default function FunctionDetailPage() {
  const intl = useIntl();
  const location = useLocation();
  const params = useParams<{ id: string }>();
  const { message } = App.useApp();

  // 从 URL 参数获取默认激活的标签，默认为 'basic'
  const searchParams = new URLSearchParams(location.search);
  const defaultTab = searchParams.get('tab') || 'basic';
  const defaultSubTab = searchParams.get('subTab') || 'json'; // 用于配置页面的子标签

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [activeSubTab, setActiveSubTab] = useState(defaultSubTab);

  const [loading, setLoading] = useState(false);
  const [functionDetail, setFunctionDetail] = useState<FunctionDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [permError, setPermError] = useState<string>('');
  const [permForm] = Form.useForm();
  const [uiConfigSaving, setUiConfigSaving] = useState(false);
  const [uiConfigForm] = Form.useForm();
  const [routeConfigSaving, setRouteConfigSaving] = useState(false);
  const [routeConfigForm] = Form.useForm();

  // Load function detail
  const loadDetail = async () => {
    if (!params.id) return;

    setLoading(true);
    try {
      const detail = await getFunctionDetail(params.id);
      setFunctionDetail(detail);
      form.setFieldsValue({
        name: detail.name,
        description: detail.description,
        category: detail.category,
        tags: detail.tags?.join(', '),
      });

      setPermError('');
      setPermLoading(true);
      try {
        const res = await getFunctionPermissions(params.id);
        const items = Array.isArray(res?.items) ? res!.items! : [];
        permForm.setFieldsValue({
          items: items.length
            ? items
            : [{ resource: 'function', actions: ['invoke'], roles: [] } as FunctionPermission],
        });
      } catch (e: any) {
        permForm.setFieldsValue({ items: [] });
        setPermError(e?.message || '加载函数权限失败');
      } finally {
        setPermLoading(false);
      }

      // Load UI Config
      const descriptor = detail?.descriptor || {};
      const menuConfig = descriptor?.menu || {};
      routeConfigForm.setFieldsValue({
        section: menuConfig.section || '',
        group: menuConfig.group || '',
        path: menuConfig.path || '',
        order: menuConfig.order || 10,
        hidden: menuConfig.hidden || false,
      });

      // UI Schema config would be loaded from function UI endpoint
      // For now initialize with empty values
      uiConfigForm.setFieldsValue({
        layoutType: 'grid',
        cols: 2,
      });
    } catch (error: any) {
      // 运行时注册的函数不在数据库中，尝试从 descriptors API 获取
      if (error?.response?.status === 400 || error?.response?.status === 404) {
        try {
          const descs = await listDescriptors();
          const descArray = Array.isArray(descs) ? descs : (descs as any)?.descriptors || [];
          const desc = descArray.find((d: FunctionDescriptor) => d.id === params.id);

          if (desc) {
            // 从 descriptor 构造函数详情
            const detailFromDesc: FunctionDetail = {
              id: desc.id,
              name: desc.display_name?.zh || desc.display_name?.en || desc.id,
              description: desc.summary?.zh || desc.summary?.en || desc.description || '',
              category: desc.category || 'general',
              version: desc.version || '1.0.0',
              enabled: true,
              tags: desc.tags || [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              provider: 'runtime',
              health: 'healthy' as const,
              descriptor: desc,
            };
            setFunctionDetail(detailFromDesc);
            form.setFieldsValue({
              name: detailFromDesc.name,
              description: detailFromDesc.description,
              category: detailFromDesc.category,
              tags: detailFromDesc.tags?.join(', '),
            });
            permForm.setFieldsValue({ items: [] });
            setPermError('运行时注册的函数不支持权限管理');
          } else {
            message.error('函数不存在');
          }
        } catch (e) {
          message.error('加载函数详情失败');
        }
      } else {
        message.error('加载函数详情失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [params.id]);

  // Handle save
  const handleSave = async (values: any) => {
    try {
      await updateFunction(params.id!, {
        name: values.name,
        description: values.description,
        category: values.category,
        tags: values.tags ? values.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      });
      message.success('保存成功');
      setEditing(false);
      loadDetail();
    } catch (error) {
      message.error('保存失败');
    }
  };

  // Handle status toggle
  const handleStatusToggle = async (enabled: boolean) => {
    try {
      await updateFunction(params.id!, { enabled });
      message.success(enabled ? '函数已启用' : '函数已禁用');
      loadDetail();
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  // Handle copy
  const handleCopy = async () => {
    try {
      const newId = await copyFunction(params.id!);
      message.success(`复制成功，新函数ID: ${newId.function_id}`);
      history.push(`/functions/${newId.function_id}`);
    } catch (error) {
      message.error('复制失败');
    }
  };

  // Handle delete
  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个函数吗？此操作不可恢复！',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteFunction(params.id!);
          message.success('删除成功');
          history.push('/functions');
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const HistoryTab = () => {
    const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const history = await getFunctionHistory(params.id!);
        setHistoryData(history || []);
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setHistoryLoading(false);
      }
    };

    useEffect(() => {
      loadHistory();
    }, [params.id]);

    return (
      <Table
        loading={historyLoading}
        dataSource={historyData}
        rowKey="id"
        columns={[
          { title: '操作', dataIndex: 'action', width: 150 },
          {
            title: '操作人',
            dataIndex: 'operator',
            width: 120
          },
          {
            title: '时间',
            dataIndex: 'timestamp',
            width: 180,
            render: (text: string) => new Date(text).toLocaleString()
          },
          {
            title: '详情',
            dataIndex: 'details',
            ellipsis: true
          },
        ]}
        pagination={{
          pageSize: 10,
        }}
      />
    );
  };

  const AnalyticsTab = () => {
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    const loadAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        const analytics = await getFunctionAnalytics(params.id!);
        setAnalyticsData(analytics);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    useEffect(() => {
      loadAnalytics();
    }, [params.id]);

    return (
      <Row gutter={16}>
        <Col span={6}>
          <Card loading={analyticsLoading}>
            <Statistic
              title="总调用次数"
              value={analyticsData?.totalCalls || 0}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={analyticsLoading}>
            <Statistic
              title="成功率"
              value={analyticsData?.successRate || 0}
              suffix="%"
              precision={2}
              valueStyle={{
                color: (analyticsData?.successRate || 0) >= 95 ? '#3f8600' : '#cf1322',
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={analyticsLoading}>
            <Statistic
              title="平均延迟"
              value={analyticsData?.avgLatency || 0}
              suffix="ms"
              precision={0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={analyticsLoading}>
            <Statistic
              title="今日调用"
              value={analyticsData?.callsToday || 0}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  if (!functionDetail && !loading) {
    return (
      <PageContainer>
        <Alert
          message="函数不存在"
          description="请检查函数ID是否正确"
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => history.push('/functions')}>
              返回函数列表
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => history.push('/functions')}
          >
            返回
          </Button>
          <span>{functionDetail?.name || functionDetail?.id}</span>
          <Badge status={functionDetail?.enabled ? 'success' : 'default'} />
        </Space>
      }
      extra={[
        <Space key="actions">
          <Button
            key="reload"
            icon={<ReloadOutlined />}
            onClick={loadDetail}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            key="copy"
            icon={<CopyOutlined />}
            onClick={handleCopy}
          >
            复制
          </Button>
          <Button
            key="delete"
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
          >
            删除
          </Button>
          <Button
            key="edit"
            type="primary"
            icon={editing ? <SaveOutlined /> : <EditOutlined />}
            onClick={() => {
              if (editing) {
                form.submit();
              } else {
                setEditing(true);
              }
            }}
          >
            {editing ? '保存' : '编辑'}
          </Button>
        </Space>
      ]}
    >
      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="基本信息" key="basic">
              <Descriptions bordered column={2}>
                <Descriptions.Item label="函数ID">
                  <code>{functionDetail?.id}</code>
                </Descriptions.Item>
                <Descriptions.Item label="版本">
                  <Tag>{functionDetail?.version || '1.0.0'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="分类">
                  <Tag color="blue">{functionDetail?.category || '默认'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Space>
                    <Switch
                      checked={functionDetail?.enabled || false}
                      onChange={handleStatusToggle}
                    />
                    <span>{functionDetail?.enabled ? '已启用' : '已禁用'}</span>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Provider">
                  {functionDetail?.provider || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="健康状态">
                  <Tag
                    color={
                      functionDetail?.health === 'healthy' ? 'green' :
                      functionDetail?.health === 'unhealthy' ? 'red' : 'gray'
                    }
                  >
                    {functionDetail?.health === 'healthy' ? '健康' :
                     functionDetail?.health === 'unhealthy' ? '异常' : '未知'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Agent 数量">
                  {functionDetail?.agentCount || 0}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {functionDetail?.createdAt ? new Date(functionDetail.createdAt).toLocaleString() : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="更新时间">
                  {functionDetail?.updatedAt ? new Date(functionDetail.updatedAt).toLocaleString() : '-'}
                </Descriptions.Item>
              </Descriptions>

              {editing && (
                <>
                  <Divider>编辑信息</Divider>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="函数名称"
                        name="name"
                        rules={[{ required: true, message: '请输入函数名称' }]}
                      >
                        <Input placeholder="请输入函数名称" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="分类" name="category">
                        <Input placeholder="请输入分类" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="描述" name="description">
                    <TextArea rows={3} placeholder="请输入函数描述" />
                  </Form.Item>
                  <Form.Item label="标签" name="tags">
                    <Input placeholder="请输入标签，多个标签用逗号分隔" />
                  </Form.Item>
                </>
              )}

              {!editing && (
                <>
                  <Divider>描述</Divider>
                  <p>{functionDetail?.description || '暂无描述'}</p>
                </>
              )}

              {!editing && functionDetail?.tags && functionDetail.tags.length > 0 && (
                <>
                  <Divider>标签</Divider>
                  <Space wrap>
                    {functionDetail.tags.map(tag => (
                      <Tag key={tag} color="geekblue">
                        {tag}
                      </Tag>
                    ))}
                  </Space>
                </>
              )}
            </TabPane>

            <TabPane tab="配置" key="config">
              <Tabs activeKey={activeSubTab} onChange={setActiveSubTab} type="card" size="small">
                <TabPane tab="JSON 视图" key="json">
                  <Alert
                    message="配置信息"
                    description="函数的完整 JSON 配置（只读）"
                    type="info"
                    showIcon
                  />
                  <pre style={{ marginTop: 16, padding: 16, background: '#f5f5f5', borderRadius: 4, maxHeight: 500, overflow: 'auto' }}>
                    {JSON.stringify(functionDetail?.descriptor || {}, null, 2)}
                  </pre>
                </TabPane>

                <TabPane tab="🎨 UI 配置" key="ui">
                  <FunctionUIManager
                    functionId={params.id || ''}
                    jsonSchema={functionDetail?.descriptor?.input_schema ?
                      JSON.parse(functionDetail.descriptor.input_schema) :
                      functionDetail?.descriptor?.schema}
                    onSave={async (uiConfig) => {
                      if (!params.id) return;
                      await saveFunctionUiSchema(params.id, uiConfig);
                    }}
                  />
                </TabPane>

                <TabPane tab="🛣️ 路由配置" key="route">
                  <Alert
                    message="路由配置"
                    description="配置函数在前端菜单中的显示和跳转路径（需要重新打包 Pack 生效）"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Card title="菜单配置" size="small">
                    <Form form={routeConfigForm} layout="vertical">
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item label="一级菜单" name="section" tooltip="例如：玩家管理">
                            <Input placeholder="留空则不分组" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="二级分组" name="group" tooltip="例如：基础功能">
                            <Input placeholder="留空则不分组" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item label="路由路径" name="path" tooltip="点击'调用函数'后跳转的路径，例如：/game/player/get">
                            <Input placeholder="/game/functions（默认）" />
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
                        description="修改路由配置后需要重新导出并上传 Pack 才能生效。此功能正在开发中，目前仅作为预览。"
                        type="warning"
                        showIcon
                      />
                    </Form>
                  </Card>
                </TabPane>
              </Tabs>
            </TabPane>

            <TabPane tab="权限" key="permissions">
              <Alert
                message="权限配置"
                description="用于控制哪些角色可以调用该函数（actions 建议使用 invoke/execute；roles 填角色名）。"
                type="info"
                showIcon
              />

              {permError && (
                <Alert style={{ marginTop: 16 }} type="error" showIcon message="无法读取权限" description={permError} />
              )}

              <Card style={{ marginTop: 16 }} loading={permLoading} size="small" title="函数权限规则">
                <Form form={permForm} layout="vertical">
                  <Form.List name="items">
                    {(fields, { add, remove }) => (
                      <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        {fields.map((field) => (
                          <Card
                            key={field.key}
                            size="small"
                            type="inner"
                            title={`规则 #${field.name + 1}`}
                            extra={
                              <Button danger size="small" onClick={() => remove(field.name)}>
                                删除
                              </Button>
                            }
                          >
                            <Row gutter={16}>
                              <Col span={6}>
                                <Form.Item
                                  {...field}
                                  label="resource"
                                  name={[field.name, 'resource']}
                                  rules={[{ required: true, message: 'resource 必填' }]}
                                >
                                  <Input placeholder="function" />
                                </Form.Item>
                              </Col>
                              <Col span={6}>
                                <Form.Item
                                  {...field}
                                  label="actions"
                                  name={[field.name, 'actions']}
                                  rules={[{ required: true, message: 'actions 必填' }]}
                                >
                                  <Select mode="tags" placeholder="invoke / execute" />
                                </Form.Item>
                              </Col>
                              <Col span={6}>
                                <Form.Item
                                  {...field}
                                  label="roles"
                                  name={[field.name, 'roles']}
                                  rules={[{ required: true, message: 'roles 必填（至少 1 个）' }]}
                                >
                                  <Select mode="tags" placeholder="例如：ops / admin / functions:manage" />
                                </Form.Item>
                              </Col>
                              <Col span={3}>
                                <Form.Item {...field} label="gameId" name={[field.name, 'gameId']}>
                                  <Input placeholder="(all)" />
                                </Form.Item>
                              </Col>
                              <Col span={3}>
                                <Form.Item {...field} label="env" name={[field.name, 'env']}>
                                  <Input placeholder="(all)" />
                                </Form.Item>
                              </Col>
                            </Row>
                          </Card>
                        ))}

                        <Space>
                          <Button onClick={() => add({ resource: 'function', actions: ['invoke'], roles: [] })}>
                            添加规则
                          </Button>
                          <Button
                            type="primary"
                            loading={permSaving}
                            onClick={async () => {
                              if (!params.id) return;
                              try {
                                setPermSaving(true);
                                const values = await permForm.validateFields();
                                const items = (values?.items || []) as FunctionPermission[];
                                await updateFunctionPermissions(params.id, items);
                                message.success('权限已更新');
                              } catch (e: any) {
                                message.error(e?.message || '更新失败');
                              } finally {
                                setPermSaving(false);
                              }
                            }}
                          >
                            保存权限
                          </Button>
                        </Space>
                      </Space>
                    )}
                  </Form.List>
                </Form>
              </Card>
            </TabPane>

            <TabPane tab="调用历史" key="history">
              <HistoryTab />
            </TabPane>

            <TabPane tab="统计分析" key="analytics">
              <AnalyticsTab />
            </TabPane>
          </Tabs>
        </Form>
      </Card>
    </PageContainer>
  );
}
