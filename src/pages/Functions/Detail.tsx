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
  Form,
  message,
  Divider,
  Timeline,
  Alert,
  Badge,
  Row,
  Col,
  Statistic,
  Modal
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
import { useParams, history } from '@umijs/max';
import { useIntl } from '@umijs/max';
import {
  getFunctionDetail,
  updateFunction,
  getFunctionHistory,
  getFunctionAnalytics,
  deleteFunction,
  copyFunction
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
  const params = useParams<{ id: string }();
  const [loading, setLoading] = useState(false);
  const [functionDetail, setFunctionDetail] = useState<FunctionDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();

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
    } catch (error) {
      message.error('加载函数详情失败');
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
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadDetail}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={handleCopy}
          >
            复制
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
          >
            删除
          </Button>
          <Button
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
          <Tabs defaultActiveKey="basic">
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
              <Alert
                message="配置信息"
                description="函数的详细配置信息"
                type="info"
                showIcon
              />
              <pre style={{ marginTop: 16, padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                {JSON.stringify(functionDetail?.descriptor || {}, null, 2)}
              </pre>
            </TabPane>

            <TabPane tab="权限" key="permissions">
              <Alert
                message="权限配置"
                description="函数的访问权限配置"
                type="info"
                showIcon
              />
              <pre style={{ marginTop: 16, padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                {JSON.stringify(functionDetail?.permissions || {}, null, 2)}
              </pre>
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