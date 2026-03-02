import React, { useState, useEffect, useMemo } from 'react';
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
  Select,
  Tooltip,
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
  ReloadOutlined,
} from '@ant-design/icons';
import FunctionUIManager from '@/components/FunctionUIManager';
import { useParams, history, useLocation } from '@umijs/max';
import { useIntl } from '@umijs/max';
import { App } from 'antd';
import { CodeEditor } from '@/components/MonacoDynamic';
import {
  getFunctionDetail,
  getFunctionOpenAPI,
  updateFunction,
  getFunctionHistory,
  getFunctionAnalytics,
  listFunctionWarnings,
  deleteFunction,
  copyFunction,
  enableFunction,
  disableFunction,
  getFunctionPermissions,
  updateFunctionPermissions,
  fetchFunctionRoute,
  saveFunctionUiSchema,
  saveFunctionRoute,
  listDescriptors,
  type FunctionPermission,
} from '@/services/api/functions';

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
  const [routeConfigSaving, setRouteConfigSaving] = useState(false);
  const [routeConfigForm] = Form.useForm();
  const routePreview = Form.useWatch([], routeConfigForm);
  const [descriptorIndexItem, setDescriptorIndexItem] = useState<any>(null);
  const [openapiOperation, setOpenapiOperation] = useState<any>(null);

  const buildSearch = (tab: string, subTab?: string) => {
    const search = new URLSearchParams(location.search);
    search.set('tab', tab);
    if (tab === 'config') {
      search.set('subTab', subTab || activeSubTab || 'json');
    } else {
      search.delete('subTab');
    }
    const query = search.toString();
    return query ? `?${query}` : '';
  };

  const parsedInputSchema = useMemo(() => {
    const detailDesc = functionDetail?.descriptor || {};
    const indexDesc = descriptorIndexItem || {};

    const parseMaybeJSON = (v: any) => {
      if (!v) return undefined;
      if (typeof v === 'string') {
        try {
          return JSON.parse(v);
        } catch {
          return undefined;
        }
      }
      if (typeof v === 'object') return v;
      return undefined;
    };

    const fromDetailInput = parseMaybeJSON(detailDesc.input_schema);
    if (fromDetailInput) return fromDetailInput;
    const fromIndexInput = parseMaybeJSON(indexDesc.input_schema);
    if (fromIndexInput) return fromIndexInput;

    const fromDetailSchema = parseMaybeJSON(detailDesc.schema);
    if (fromDetailSchema) return fromDetailSchema;
    const fromIndexSchema = parseMaybeJSON(indexDesc.schema);
    if (fromIndexSchema) return fromIndexSchema;

    const fromDetailParams = parseMaybeJSON(detailDesc.params);
    if (fromDetailParams) return fromDetailParams;
    const fromIndexParams = parseMaybeJSON(indexDesc.params);
    if (fromIndexParams) return fromIndexParams;

    const openapiSchema = openapiOperation?.requestBody?.content?.['application/json']?.schema;
    if (openapiSchema && typeof openapiSchema === 'object') return openapiSchema;

    return undefined;
  }, [functionDetail?.descriptor, descriptorIndexItem, openapiOperation]);

  const effectiveCategory = useMemo(() => {
    const direct = String(functionDetail?.category || '').trim();
    if (direct) return direct;
    const fromIndex = String((descriptorIndexItem as any)?.category || '').trim();
    if (fromIndex) return fromIndex;
    const fromDetailDesc = String((functionDetail?.descriptor as any)?.category || '').trim();
    if (fromDetailDesc) return fromDetailDesc;
    const fromOpenapi = String((openapiOperation as any)?.extensions?.['x-category'] || '').trim();
    if (fromOpenapi) return fromOpenapi;
    return '';
  }, [functionDetail?.category, functionDetail?.descriptor, descriptorIndexItem, openapiOperation]);

  const jsonViewData = useMemo(
    () => ({
      function: functionDetail
        ? {
            id: functionDetail.id,
            name: functionDetail.name,
            description: functionDetail.description,
            category: effectiveCategory,
            version: functionDetail.version,
            enabled: functionDetail.enabled,
            tags: functionDetail.tags || [],
            provider: functionDetail.provider,
          }
        : null,
      descriptor_from_detail_api: functionDetail?.descriptor || null,
      descriptor_from_index_api: descriptorIndexItem || null,
      openapi_operation: openapiOperation || null,
      route: routePreview || null,
    }),
    [functionDetail, descriptorIndexItem, openapiOperation, routePreview, effectiveCategory],
  );

  const uiDescriptor = useMemo(() => {
    const detailDesc = functionDetail?.descriptor || {};
    const indexDesc = descriptorIndexItem || {};
    return {
      ...detailDesc,
      ...indexDesc,
      entity: indexDesc?.entity || detailDesc?.entity,
      operation: indexDesc?.operation || detailDesc?.operation,
      entity_display: indexDesc?.entity_display || detailDesc?.entity_display,
      operation_display: indexDesc?.operation_display || detailDesc?.operation_display,
    };
  }, [functionDetail?.descriptor, descriptorIndexItem]);

  const JsonViewer = ({ data }: { data: any }) => {
    const pretty = JSON.stringify(data || {}, null, 2);
    const beforeMount = (monaco: any) => {
      if (!monaco?.editor || monaco.editor.getTheme?.() === 'sublime-monokai') return;
      monaco.editor.defineTheme('sublime-monokai', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'string.key.json', foreground: '66D9EF' }, // key: cyan
          { token: 'string.value.json', foreground: 'A6E22E' }, // string: olive green
          { token: 'number', foreground: 'E6DB74' }, // number: yellow
          { token: 'keyword', foreground: 'F92672' }, // true/false/null
        ],
        colors: {
          'editor.background': '#272822',
          'editorLineNumber.foreground': '#75715E',
          'editorLineNumber.activeForeground': '#F8F8F2',
        },
      });
    };
    const copyJson = async () => {
      try {
        await navigator.clipboard.writeText(pretty);
        message.success('JSON 已复制');
      } catch {
        message.error('复制失败');
      }
    };
    return (
      <div
        style={{
          border: '1px solid #f0f0f0',
          borderRadius: 6,
          overflow: 'hidden',
          background: '#fafafa',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '8px 12px',
            borderBottom: '1px solid #f0f0f0',
            background: '#fff',
          }}
        >
          <Tooltip title="复制 JSON">
            <Button size="small" icon={<CopyOutlined />} onClick={copyJson}>
              复制
            </Button>
          </Tooltip>
        </div>
        <CodeEditor
          value={pretty}
          language="json"
          height={500}
          readOnly
          theme="sublime-monokai"
          beforeMount={beforeMount}
          options={{
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            minimap: { enabled: false },
          }}
        />
      </div>
    );
  };

  const loadSourceOfTruth = async (functionId: string) => {
    try {
      const [descsRes, openapiRes] = await Promise.allSettled([
        listDescriptors(),
        getFunctionOpenAPI(functionId),
      ]);
      if (descsRes.status === 'fulfilled') {
        const descs = descsRes.value;
        const descArray = Array.isArray(descs) ? descs : (descs as any)?.descriptors || [];
        setDescriptorIndexItem(descArray.find((d: any) => d.id === functionId) || null);
      } else {
        setDescriptorIndexItem(null);
      }
      if (openapiRes.status === 'fulfilled') {
        setOpenapiOperation(openapiRes.value || null);
      } else {
        setOpenapiOperation(null);
      }
    } catch {
      setDescriptorIndexItem(null);
      setOpenapiOperation(null);
    }
  };

  // Load function detail
  const loadDetail = async () => {
    if (!params.id) return;

    setLoading(true);
    try {
      const detail = await getFunctionDetail(params.id);
      await loadSourceOfTruth(params.id);
      setFunctionDetail(detail);
      const categoryFromDetail =
        detail.category ||
        detail?.descriptor?.category ||
        (descriptorIndexItem as any)?.category ||
        '';
      form.setFieldsValue({
        name: detail.name,
        description: detail.description,
        category: categoryFromDetail,
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
      const mergedRoute = {
        nodes: Array.isArray(menuConfig.nodes) ? menuConfig.nodes : [],
        path: menuConfig.path ?? '',
        order: menuConfig.order ?? 10,
        hidden: menuConfig.hidden ?? false,
      };
      if (params.id) {
        try {
          const routeRes = await fetchFunctionRoute(params.id);
          const rm = routeRes?.menu || {};
          mergedRoute.nodes = Array.isArray(rm.nodes) ? rm.nodes : mergedRoute.nodes;
          mergedRoute.path = rm.path ?? mergedRoute.path;
          mergedRoute.order = rm.order ?? mergedRoute.order;
          mergedRoute.hidden = rm.hidden ?? mergedRoute.hidden;
        } catch {
          // Keep descriptor defaults when route API is unavailable.
        }
      }
      routeConfigForm.setFieldsValue({
        nodes: mergedRoute.nodes,
        path: mergedRoute.path,
        order: mergedRoute.order,
        hidden: mergedRoute.hidden,
      });
    } catch (error: any) {
      // 运行时注册的函数不在数据库中，尝试从 descriptors API 获取
      if (error?.response?.status === 400 || error?.response?.status === 404) {
        try {
          const descs = await listDescriptors();
          const descArray = Array.isArray(descs) ? descs : (descs as any)?.descriptors || [];
          const desc = descArray.find((d: any) => d.id === params.id);

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
              createdAt: '',
              updatedAt: '',
              provider: 'runtime',
              health: 'healthy' as const,
              descriptor: desc,
            };
            await loadSourceOfTruth(params.id);
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

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    setActiveTab(searchParams.get('tab') || 'basic');
    setActiveSubTab(searchParams.get('subTab') || 'json');
  }, [location.search]);

  // Handle save
  const handleSave = async (values: any) => {
    try {
      await updateFunction(params.id!, {
        name: values.name,
        description: values.description,
        category: values.category,
        tags: values.tags
          ? values.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
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
      if (enabled) {
        await enableFunction(params.id!);
      } else {
        await disableFunction(params.id!);
      }
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
      history.push(`/game/functions/${newId.function_id}`);
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
          history.push('/game/functions/catalog');
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
            width: 120,
          },
          {
            title: '时间',
            dataIndex: 'timestamp',
            width: 180,
            render: (text: string) => new Date(text).toLocaleString(),
          },
          {
            title: '详情',
            dataIndex: 'details',
            ellipsis: true,
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
            <Statistic title="今日调用" value={analyticsData?.callsToday || 0} />
          </Card>
        </Col>
      </Row>
    );
  };

  const WarningsTab = () => {
    const [warningsData, setWarningsData] = useState<any[]>([]);
    const [warningsLoading, setWarningsLoading] = useState(false);

    const loadWarnings = async () => {
      if (!params.id) return;
      setWarningsLoading(true);
      try {
        const res = await listFunctionWarnings({ function_id: params.id, limit: 200 });
        setWarningsData(Array.isArray(res?.items) ? res.items : []);
      } catch (error) {
        console.error('Failed to load registration warnings:', error);
        setWarningsData([]);
      } finally {
        setWarningsLoading(false);
      }
    };

    useEffect(() => {
      loadWarnings();
    }, [params.id]);

    return (
      <>
        <Alert
          message="注册告警"
          description="这里显示函数注册校验告警（例如 function_id 格式错误、版本号不合法、重复注册去重）。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button
              size="small"
              onClick={() =>
                history.push(
                  `/game/functions/warnings?function_id=${encodeURIComponent(params.id || '')}`,
                )
              }
            >
              查看全部
            </Button>
          }
        />
        <Table
          loading={warningsLoading}
          dataSource={warningsData}
          rowKey="key"
          columns={[
            {
              title: '代码',
              dataIndex: 'code',
              width: 180,
              render: (code: string) => <Tag color="orange">{code || '-'}</Tag>,
            },
            {
              title: '版本',
              dataIndex: 'version',
              width: 120,
              render: (v: string) => v || '-',
            },
            {
              title: '次数',
              dataIndex: 'count',
              width: 90,
            },
            {
              title: '最近时间',
              dataIndex: 'last_seen',
              width: 180,
              render: (text: string) => (text ? new Date(text).toLocaleString() : '-'),
            },
            {
              title: 'Agent',
              dataIndex: 'agent_id',
              width: 220,
              ellipsis: true,
            },
            {
              title: '详情',
              dataIndex: 'message',
              ellipsis: true,
            },
          ]}
          pagination={{ pageSize: 10 }}
        />
      </>
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
            <Button type="primary" onClick={() => history.push('/game/functions/catalog')}>
              返回函数列表
            </Button>
          }
        />
      </PageContainer>
    );
  }

  // Define tab items using useMemo to avoid deprecation warning
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
          <Tabs
            style={{ marginTop: 16 }}
            type="card"
            size="small"
            items={[
              {
                key: 'json-detail',
                label: 'Detail API',
                children: <JsonViewer data={jsonViewData.descriptor_from_detail_api || {}} />,
              },
              {
                key: 'json-index',
                label: 'Descriptor Index',
                children: <JsonViewer data={jsonViewData.descriptor_from_index_api || {}} />,
              },
              {
                key: 'json-openapi',
                label: 'OpenAPI',
                children: <JsonViewer data={jsonViewData.openapi_operation || {}} />,
              },
              {
                key: 'json-route',
                label: 'Route',
                children: <JsonViewer data={jsonViewData.route || {}} />,
              },
            ]}
          />
        </>
      ),
    },
    {
      key: 'ui',
      label: '🎨 UI 配置',
      children: (
        <FunctionUIManager
          functionId={params.id || ''}
          descriptor={uiDescriptor}
          jsonSchema={parsedInputSchema}
          onSave={async (uiConfig) => {
            if (!params.id) return;
            await saveFunctionUiSchema(params.id, uiConfig);
          }}
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
              <Button size="small" onClick={() => history.push('/game/functions/assignments')}>
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
                <Button
                  type="primary"
                  loading={routeConfigSaving}
                  onClick={async () => {
                    if (!params.id) return;
                    try {
                      setRouteConfigSaving(true);
                      const v = await routeConfigForm.validateFields();
                      await saveFunctionRoute(params.id, {
                        nodes: Array.isArray(v.nodes) ? v.nodes : [],
                        path: v.path || '',
                        order: v.order ?? 10,
                        hidden: !!v.hidden,
                      });
                      window.dispatchEvent(new CustomEvent('function-route:changed'));
                      message.success('路由配置已保存');
                    } catch {
                      // validation error
                    } finally {
                      setRouteConfigSaving(false);
                    }
                  }}
                >
                  保存路由配置
                </Button>
                <Button
                  onClick={async () => {
                    const descriptor = functionDetail?.descriptor || {};
                    const menuConfig = descriptor?.menu || {};
                    const resetRoute = {
                      nodes: Array.isArray(menuConfig.nodes) ? menuConfig.nodes : [],
                      path: menuConfig.path || '',
                      order: menuConfig.order || 10,
                      hidden: menuConfig.hidden || false,
                    };
                    routeConfigForm.setFieldsValue(resetRoute);
                    if (params.id) {
                      await saveFunctionRoute(params.id, resetRoute);
                    }
                    window.dispatchEvent(new CustomEvent('function-route:changed'));
                    message.success('已恢复为默认路由');
                  }}
                >
                  恢复默认
                </Button>
              </Space>
            </Form>
          </Card>
        </>
      ),
    },
  ];

  const mainTabItems = [
    {
      key: 'basic',
      label: '基本信息',
      children: (
        <>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="函数ID">
              <code>{functionDetail?.id}</code>
            </Descriptions.Item>
            <Descriptions.Item label="版本">
              <Tag>{functionDetail?.version || '1.0.0'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="分类">
              <Tag color="blue">{effectiveCategory || '默认'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Space>
                <Switch checked={functionDetail?.enabled || false} onChange={handleStatusToggle} />
                <span>{functionDetail?.enabled ? '已启用' : '已禁用'}</span>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Provider">
              {functionDetail?.provider || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="健康状态">
              <Tag
                color={
                  functionDetail?.health === 'healthy'
                    ? 'green'
                    : functionDetail?.health === 'unhealthy'
                    ? 'red'
                    : 'gray'
                }
              >
                {functionDetail?.health === 'healthy'
                  ? '健康'
                  : functionDetail?.health === 'unhealthy'
                  ? '异常'
                  : '未知'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Agent 数量">
              {functionDetail?.agentCount || 0}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {functionDetail?.createdAt
                ? new Date(functionDetail.createdAt).toLocaleString()
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {functionDetail?.updatedAt
                ? new Date(functionDetail.updatedAt).toLocaleString()
                : '-'}
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
                {functionDetail.tags.map((tag) => (
                  <Tag key={tag} color="geekblue">
                    {tag}
                  </Tag>
                ))}
              </Space>
            </>
          )}
        </>
      ),
    },
    {
      key: 'config',
      label: '配置',
      children: (
        <Tabs
          activeKey={activeSubTab}
          onChange={(key) => {
            setActiveSubTab(key);
            history.replace(`${location.pathname}${buildSearch('config', key)}`);
          }}
          type="card"
          size="small"
          items={configTabItems}
        />
      ),
    },
    {
      key: 'permissions',
      label: '权限',
      children: (
        <>
          <Alert
            message="权限配置"
            description="用于控制哪些角色可以调用该函数（actions 建议使用 invoke/execute；roles 填角色名）。"
            type="info"
            showIcon
          />

          {permError && (
            <Alert
              style={{ marginTop: 16 }}
              type="error"
              showIcon
              message="无法读取权限"
              description={permError}
            />
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
                              <Select
                                mode="tags"
                                placeholder="例如：ops / admin / functions:manage"
                              />
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
                      <Button
                        onClick={() =>
                          add({ resource: 'function', actions: ['invoke'], roles: [] })
                        }
                      >
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
        </>
      ),
    },
    {
      key: 'history',
      label: '调用历史',
      children: <HistoryTab />,
    },
    {
      key: 'analytics',
      label: '统计分析',
      children: <AnalyticsTab />,
    },
    {
      key: 'warnings',
      label: '注册告警',
      children: <WarningsTab />,
    },
  ];

  return (
    <PageContainer
      title={
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => history.push('/game/functions/catalog')}
          >
            返回
          </Button>
          <span>{functionDetail?.name || functionDetail?.id}</span>
          <Badge status={functionDetail?.enabled ? 'success' : 'default'} />
        </Space>
      }
      extra={[
        <Space key="actions">
          <Button key="reload" icon={<ReloadOutlined />} onClick={loadDetail} loading={loading}>
            刷新
          </Button>
          <Button key="copy" icon={<CopyOutlined />} onClick={handleCopy}>
            复制
          </Button>
          <Button key="delete" danger icon={<DeleteOutlined />} onClick={handleDelete}>
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
        </Space>,
      ]}
    >
      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={handleSave} component={false}>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key);
              history.replace(
                `${location.pathname}${buildSearch(
                  key,
                  key === 'config' ? activeSubTab : undefined,
                )}`,
              );
            }}
            items={mainTabItems}
          />
        </Form>
      </Card>
    </PageContainer>
  );
}
