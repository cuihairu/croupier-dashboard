import React, { useEffect, useMemo, useState } from 'react';
import { PageContainer, ProTable, ProColumns } from '@ant-design/pro-components';
import {
  Card,
  Space,
  Select,
  Button,
  Typography,
  Alert,
  App,
  Tag,
  Badge,
  Tooltip,
  Modal,
  Form,
  Input,
  Switch,
  Popconfirm,
  Divider,
  Descriptions,
  Statistic,
  Row,
  Col,
  Tabs,
  List,
  Progress,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExperimentOutlined,
  HistoryOutlined,
  SettingOutlined,
  RocketOutlined,
  CopyOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useModel } from '@umijs/max';
import { useIntl } from '@umijs/max';
import { history as routerHistory } from '@umijs/max';
import GameSelector from '@/components/GameSelector';
import {
  listDescriptors,
  fetchAssignments,
  setAssignments,
  FunctionDescriptor,
  AssignmentConfig,
  AssignmentHistory,
  CanaryConfig,
} from '@/services/api';

type AssignmentItem = {
  id: string;
  name: string;
  version: string;
  category: string;
  status: 'active' | 'canary' | 'disabled';
  canary?: CanaryConfig;
  assignedAt?: string;
  updatedAt?: string;
};

type AssignmentGroup = {
  category: string;
  items: AssignmentItem[];
};

export default function AssignmentsPage() {
  const { message } = App.useApp();
  const intl = useIntl();
  const [descs, setDescs] = useState<FunctionDescriptor[]>([]);
  const [gameId, setGameId] = useState<string | undefined>(localStorage.getItem('game_id') || undefined);
  const [env, setEnv] = useState<string | undefined>(localStorage.getItem('env') || undefined);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [history, setHistory] = useState<AssignmentHistory[]>([]);
  const [canaryModalVisible, setCanaryModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  const options = useMemo(
    () => (Array.isArray(descs) ? descs : []).map((d) => ({
      label: `${d.id} v${d.version || ''}`,
      value: d.id,
      version: d.version,
      category: d.category || 'general',
      displayName: d.display_name || d.id,
    })),
    [descs],
  );

  const { initialState } = useModel('@@initialState');
  const roles = useMemo(() => {
    const acc = (initialState as any)?.currentUser?.access as string | undefined;
    return (acc ? acc.split(',') : []).filter(Boolean);
  }, [initialState]);
  const canWrite = roles.includes('*') || roles.includes('assignments:write');

  // Group assignments by category
  const groupedAssignments = useMemo(() => {
    const groups: Record<string, AssignmentItem[]> = {};
    options.forEach((opt) => {
      const category = opt.category || 'general';
      const isSelected = selected.includes(opt.value);
      const status: AssignmentItem['status'] = isSelected ? 'active' : 'disabled';

      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({
        id: opt.value,
        name: opt.displayName,
        version: opt.version,
        category: opt.category,
        status,
        assignedAt: isSelected ? new Date().toISOString() : undefined,
      });
    });

    return Object.entries(groups).map(([category, items]) => ({
      category,
      items,
      activeCount: items.filter((i) => i.status === 'active').length,
      canaryCount: items.filter((i) => i.status === 'canary').length,
    }));
  }, [options, selected]);

  // Statistics
  const stats = useMemo(() => {
    const total = options.length;
    const active = selected.length;
    const inactive = total - active;
    const categories = new Set(options.map((o) => o.category)).size;

    return { total, active, inactive, categories };
  }, [options, selected]);

  async function load() {
    setLoading(true);
    try {
      const d = await listDescriptors();
      if (Array.isArray(d)) {
        setDescs(d);
      } else if (d && Array.isArray((d as any)?.descriptors)) {
        setDescs((d as any).descriptors);
      } else {
        setDescs([]);
      }
      if (gameId) {
        try {
          const res = await fetchAssignments({ game_id: gameId, env });
          const m = res?.assignments || {};
          const fns = Object.values(m).flat();
          setSelected(fns || []);
        } catch {
          setSelected([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, [gameId, env]);

  useEffect(() => {
    const onStorage = () => {
      setGameId(localStorage.getItem('game_id') || undefined);
      setEnv(localStorage.getItem('env') || undefined);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const onSave = async () => {
    if (!gameId) {
      message.warning(intl.formatMessage({ id: 'pages.assignments.select.game' }));
      return;
    }
    setLoading(true);
    try {
      const res = await setAssignments({ game_id: gameId, env, functions: selected });
      const unknown = res?.unknown || [];
      if (unknown.length > 0) {
        message.warning(
          intl.formatMessage(
            { id: 'pages.assignments.save.warning' },
            { count: unknown.length, ids: unknown.join(', ') },
          ),
        );
      } else {
        message.success(intl.formatMessage({ id: 'pages.assignments.save.success' }));
      }
      await load();
    } finally {
      setLoading(false);
    }
  };

  const onBatchAssign = (category: string, assign: boolean) => {
    const itemsInCategory = options.filter((o) => o.category === category);
    const ids = itemsInCategory.map((o) => o.value);

    if (assign) {
      setSelected([...new Set([...selected, ...ids])]);
    } else {
      setSelected(selected.filter((id) => !ids.includes(id)));
    }
  };

  const onCloneToEnv = async (targetEnv: string) => {
    if (!gameId) return;
    setLoading(true);
    try {
      await setAssignments({ game_id: gameId, env: targetEnv, functions: selected });
      message.success(`已克隆分配到 ${targetEnv} 环境`);
    } catch (e: any) {
      message.error(`克隆失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    // Mock history data
    setHistory([
      {
        id: '1',
        game_id: gameId || '',
        env: env || 'prod',
        function_id: 'all',
        action: 'assign',
        count: selected.length,
        operated_by: 'admin',
        operated_at: new Date(Date.now() - 3600000).toISOString(),
        details: { functions: selected.slice(0, 5) },
      },
      {
        id: '2',
        game_id: gameId || '',
        env: env || 'prod',
        function_id: 'player.ban',
        action: 'remove',
        count: 1,
        operated_by: 'admin',
        operated_at: new Date(Date.now() - 86400000).toISOString(),
        details: { reason: '功能维护中' },
      },
    ]);
    setHistoryVisible(true);
  };

  const columns: ProColumns<AssignmentItem>[] = [
    {
      title: '函数ID',
      dataIndex: 'id',
      width: 200,
      copyable: true,
      render: (_, record) => (
        <Space>
          <Badge
            status={
              record.status === 'active'
                ? 'success'
                : record.status === 'canary'
                ? 'processing'
                : 'default'
            }
          />
          <span>{record.id}</span>
        </Space>
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 180,
      ellipsis: true,
    },
    {
      title: '版本',
      dataIndex: 'version',
      width: 100,
      render: (text) => <Tag color="blue">{text || '-'}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (text) => {
        const config = {
          active: { color: 'success', text: '已启用' },
          canary: { color: 'processing', text: '灰度中' },
          disabled: { color: 'default', text: '未启用' },
        } as const;
        const c = config[text as keyof typeof config] || config.disabled;
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
    {
      title: '分配时间',
      dataIndex: 'assignedAt',
      width: 180,
      render: (text) => (text ? new Date(text).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      width: 180,
      render: (_, record) => (
        <Space>
          {record.status !== 'active' && (
            <Tooltip title="启用">
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => setSelected([...selected, record.id])}
              />
            </Tooltip>
          )}
          {record.status === 'active' && (
            <Tooltip title="禁用">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => setSelected(selected.filter((id) => id !== record.id))}
              />
            </Tooltip>
          )}
          <Tooltip title="灰度配置">
            <Button
              type="link"
              size="small"
              icon={<ExperimentOutlined />}
              onClick={() => {
                setEditingAssignment(record);
                setCanaryModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => {
                // 跳转到函数详情页的 UI 配置标签
                const targetUrl = `/game/functions/${encodeURIComponent(record.id)}?tab=config&subTab=ui`;
                routerHistory.push(targetUrl);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="函数分配管理"
      subTitle="管理不同游戏环境中可用的函数列表"
      extra={[
        <GameSelector key="game" />,
        <Button key="history" icon={<HistoryOutlined />} onClick={loadHistory}>
          变更历史
        </Button>,
        <Button
          key="clone"
          icon={<CopyOutlined />}
          onClick={() => {
            Modal.confirm({
              title: '克隆分配配置',
              content: (
                <div>
                  <p>选择目标环境:</p>
                  <Select
                    style={{ width: '100%' }}
                    options={[
                      { label: '开发环境 (dev)', value: 'dev' },
                      { label: '测试环境 (test)', value: 'test' },
                      { label: '预发布环境 (staging)', value: 'staging' },
                      { label: '生产环境 (prod)', value: 'prod' },
                    ]}
                    onChange={(value) => onCloneToEnv(value)}
                  />
                </div>
              ),
            });
          }}
        >
          克隆到环境
        </Button>,
      ]}
    >
      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总函数数"
              value={stats.total}
              prefix={<SettingOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已分配"
              value={stats.active}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="未分配"
              value={stats.inactive}
              valueStyle={{ color: '#cf1322' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="分类数"
              value={stats.categories}
              prefix={<ExperimentOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'list',
              label: `列表视图 (${stats.active}/${stats.total})`,
              children: (
                <>
                  {/* Batch Operations Bar */}
                  <Space style={{ marginBottom: 16, width: '100%' }} wrap>
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => setSelected(options.map((o) => o.value))}
                    >
                      全选
                    </Button>
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={() => setSelected([])}
                    >
                      清空
                    </Button>
                    <Divider type="vertical" />
                    {groupedAssignments.map((group) => (
                      <Space key={group.category} style={{ marginRight: 16 }}>
                        <span>{group.category}:</span>
                        <Button size="small" onClick={() => onBatchAssign(group.category, true)}>
                          启用
                        </Button>
                        <Button size="small" onClick={() => onBatchAssign(group.category, false)}>
                          禁用
                        </Button>
                      </Space>
                    ))}
                    <Divider type="vertical" />
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={onSave}
                      disabled={!gameId || !canWrite}
                      loading={loading}
                    >
                      保存分配
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
                      刷新
                    </Button>
                  </Space>

                  {/* Category Grouped Display */}
                  {groupedAssignments.map((group) => (
                    <Card
                      key={group.category}
                      type="inner"
                      title={
                        <Space>
                          <span>{group.category}</span>
                          <Tag color="blue">{group.items.length} 个函数</Tag>
                          <Tag color="green">{group.activeCount} 已启用</Tag>
                          <Tag color="orange">{group.canaryCount} 灰度中</Tag>
                        </Space>
                      }
                      style={{ marginBottom: 16 }}
                      extra={
                        <Space>
                          <Button size="small" onClick={() => onBatchAssign(group.category, true)}>
                            全部启用
                          </Button>
                          <Button size="small" onClick={() => onBatchAssign(group.category, false)}>
                            全部禁用
                          </Button>
                        </Space>
                      }
                    >
                      <ProTable<AssignmentItem>
                        rowKey="id"
                        columns={columns}
                        dataSource={group.items}
                        pagination={false}
                        search={false}
                        toolBarRender={false}
                        options={false}
                        rowSelection={{
                          type: 'checkbox',
                          selectedRowKeys: selected,
                          onChange: (keys) => setSelected(keys as string[]),
                        }}
                      />
                    </Card>
                  ))}
                </>
              ),
            },
            {
              key: 'category',
              label: '分类管理',
              children: (
                <ProTable<AssignmentGroup>
                  rowKey="category"
                  columns={[
                    {
                      title: '分类',
                      dataIndex: 'category',
                      width: 200,
                    },
                    {
                      title: '函数数量',
                      dataIndex: 'items',
                      width: 120,
                      render: (_, record) => record.items.length,
                    },
                    {
                      title: '已启用',
                      dataIndex: 'activeCount',
                      width: 120,
                      render: (text) => <Tag color="green">{text}</Tag>,
                    },
                    {
                      title: '启用率',
                      width: 150,
                      render: (_, record) => {
                        const percent =
                          record.items.length > 0
                            ? Math.round((record.activeCount / record.items.length) * 100)
                            : 0;
                        return (
                          <Progress
                            percent={percent}
                            size="small"
                            status={percent === 100 ? 'success' : undefined}
                          />
                        );
                      },
                    },
                    {
                      title: '操作',
                      width: 200,
                      render: (_, record) => (
                        <Space>
                          <Button
                            size="small"
                            type="primary"
                            ghost
                            onClick={() => onBatchAssign(record.category, true)}
                          >
                            全部启用
                          </Button>
                          <Button
                            size="small"
                            danger
                            onClick={() => onBatchAssign(record.category, false)}
                          >
                            全部禁用
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                  dataSource={groupedAssignments}
                  pagination={false}
                  search={false}
                  toolBarRender={false}
                  options={false}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* History Modal */}
      <Modal
        title="分配变更历史"
        open={historyVisible}
        onCancel={() => setHistoryVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setHistoryVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <List
          dataSource={history}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    <Tag color={item.action === 'assign' ? 'green' : 'red'}>
                      {item.action === 'assign' ? '分配' : '移除'}
                    </Tag>
                    <span>{item.function_id}</span>
                    <span>({item.count} 个函数)</span>
                  </Space>
                }
                description={
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <span>
                      操作人: {item.operated_by} | 时间:{' '}
                      {new Date(item.operated_at).toLocaleString('zh-CN')}
                    </span>
                    {item.details && (
                      <Descriptions size="small" column={1} bordered>
                        {Object.entries(item.details).map(([k, v]) => (
                          <Descriptions.Item key={k} label={k}>
                            {JSON.stringify(v)}
                          </Descriptions.Item>
                        ))}
                      </Descriptions>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* Canary Configuration Modal */}
      <Modal
        title="灰度配置"
        open={canaryModalVisible}
        onCancel={() => setCanaryModalVisible(false)}
        onOk={() => {
          message.success('灰度配置已保存');
          setCanaryModalVisible(false);
        }}
        width={600}
      >
        {editingAssignment && (
          <Form layout="vertical">
            <Form.Item label="函数ID">
              <Input value={editingAssignment.id} disabled />
            </Form.Item>
            <Form.Item label="启用灰度发布">
              <Switch />
            </Form.Item>
            <Form.Item label="灰度比例 (%)">
              <Input type="number" min={1} max={100} defaultValue={10} />
            </Form.Item>
            <Form.Item label="灰度规则">
              <Input.TextArea
                rows={4}
                placeholder='例如: {"user_id": "prefix:1000"}'
              />
            </Form.Item>
            <Form.Item label="灰度时长">
              <Select
                defaultValue="7d"
                options={[
                  { label: '1 天', value: '1d' },
                  { label: '3 天', value: '3d' },
                  { label: '7 天', value: '7d' },
                  { label: '14 天', value: '14d' },
                  { label: '30 天', value: '30d' },
                ]}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </PageContainer>
  );
}
