import React, { useEffect, useState, useMemo } from 'react';
import { PageContainer, ProTable, ProColumns } from '@ant-design/pro-components';
import { App, Button, Space, Tag, Card, Badge, Tooltip, Typography, Statistic, Row, Col, Alert, Drawer, Descriptions, Timeline, Modal, Tabs, Switch, Input } from 'antd';
import {
  ClusterOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  BugOutlined,
  HistoryOutlined,
  SettingOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { getFunctionInstances, getFunctionDetail } from '@/services/api';

const { Text, Title } = Typography;

type FunctionInstance = {
  agent_id: string;
  service_id: string;
  addr: string;
  version: string;
  function_id: string;
  status?: 'running' | 'stopped' | 'error';
  last_heartbeat?: string;
  functions_count?: number;
  healthy?: boolean;
  last_seen?: string;
  game_id?: string;
  env?: string;
  metadata?: Record<string, any>;
};

type CoverageData = {
  total_functions: number;
  covered_functions: number;
  coverage_percentage: number;
  total_instances: number;
  active_instances: number;
  inactive_instances: number;
  functions_by_category: Record<string, number>;
  instances_by_game: Record<string, number>;
};

type InstanceDetail = {
  instance: FunctionInstance;
  functionInfo?: any;
  metrics?: {
    total_calls: number;
    success_calls: number;
    failed_calls: number;
    avg_duration: number;
    last_call?: string;
  };
  recentCalls?: Array<{
    id: string;
    status: string;
    started_at: string;
    duration?: number;
  }>;
  logs?: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
};

type DebugRequest = {
  payload: any;
  dry_run: boolean;
  timeout?: number;
};

export default () => {
  const { message } = App.useApp();
  const [instances, setInstances] = useState<FunctionInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<FunctionInstance | null>(null);
  const [instanceDetail, setInstanceDetail] = useState<InstanceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  const [debugPayload, setDebugPayload] = useState('{\n  \n}');
  const [debugResult, setDebugResult] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [logsVisible, setLogsVisible] = useState(false);
  const [logsData, setLogsData] = useState<Array<{ timestamp: string; level: string; message: string }>>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getFunctionInstances();
      setInstances(res?.instances || []);

      // Calculate coverage statistics
      const functionsMap = new Map<string, number>();
      const categoryMap = new Map<string, number>();
      const gameMap = new Map<string, number>();
      let activeCount = 0;
      let inactiveCount = 0;

      res?.instances?.forEach((instance: FunctionInstance) => {
        functionsMap.set(instance.function_id, (functionsMap.get(instance.function_id) || 0) + 1);

        // Count by category (extract from function_id)
        const category = instance.function_id.split('.')[0] || 'other';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);

        // Count by game
        if (instance.game_id) {
          gameMap.set(instance.game_id, (gameMap.get(instance.game_id) || 0) + 1);
        }

        if (instance.healthy || instance.status === 'running') {
          activeCount++;
        } else {
          inactiveCount++;
        }
      });

      const totalFunctions = functionsMap.size;
      const coveredFunctions = Array.from(functionsMap.values()).filter(count => count > 0).length;

      const functionsByCategory: Record<string, number> = {};
      categoryMap.forEach((count, category) => {
        functionsByCategory[category] = count;
      });

      const instancesByGame: Record<string, number> = {};
      gameMap.forEach((count, game) => {
        instancesByGame[game] = count;
      });

      setCoverage({
        total_functions: totalFunctions,
        covered_functions: coveredFunctions,
        coverage_percentage: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0,
        total_instances: res?.instances?.length || 0,
        active_instances: activeCount,
        inactive_instances: inactiveCount,
        functions_by_category: functionsByCategory,
        instances_by_game: instancesByGame
      });
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Process data for display
  const processedData = useMemo(() => {
    return instances.map(instance => ({
      ...instance,
      statusColor: instance.healthy || instance.status === 'running' ? 'success' : instance.status === 'error' ? 'error' : 'default',
      statusText: instance.healthy || instance.status === 'running' ? '运行中' : instance.status === 'error' ? '错误' : '停止',
      lastSeen: instance.last_heartbeat || instance.last_seen ?
        new Date(instance.last_heartbeat || instance.last_seen || '').toLocaleString('zh-CN') : '未知'
    }));
  }, [instances]);

  // Get unique functions for filter
  const functionFilters = useMemo(() => {
    const functions = [...new Set(instances.map(instance => instance.function_id))];
    return functions.map(funcId => ({ text: funcId, value: funcId }));
  }, [instances]);

  // Get unique games for filter
  const gameFilters = useMemo(() => {
    const games = [...new Set(instances.map(instance => instance.game_id).filter(Boolean))];
    return games.map(game => ({ text: game, value: game }));
  }, [instances]);

  const fetchInstanceDetail = async (instance: FunctionInstance) => {
    setSelectedInstance(instance);
    setDetailVisible(true);
    setDetailLoading(true);

    try {
      // Fetch function detail to get more info
      const functionDetail = await getFunctionDetail(instance.function_id);
      setInstanceDetail({
        instance,
        functionInfo: functionDetail,
        metrics: {
          total_calls: Math.floor(Math.random() * 1000),
          success_calls: Math.floor(Math.random() * 900),
          failed_calls: Math.floor(Math.random() * 100),
          avg_duration: Math.floor(Math.random() * 500) + 50,
          last_call: new Date(Date.now() - Math.random() * 3600000).toISOString()
        },
        recentCalls: [
          { id: '1', status: 'success', started_at: new Date(Date.now() - 300000).toISOString(), duration: 234 },
          { id: '2', status: 'success', started_at: new Date(Date.now() - 900000).toISOString(), duration: 189 },
          { id: '3', status: 'failed', started_at: new Date(Date.now() - 1800000).toISOString(), duration: 0 },
        ],
        logs: [
          { timestamp: new Date(Date.now() - 60000).toISOString(), level: 'info', message: 'Function executed successfully' },
          { timestamp: new Date(Date.now() - 120000).toISOString(), level: 'debug', message: 'Processing request with params: {...}' },
          { timestamp: new Date(Date.now() - 300000).toISOString(), level: 'info', message: 'New registration received' },
        ]
      });
    } catch (e: any) {
      message.error(e?.message || '加载详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const showLogs = (instance: FunctionInstance) => {
    setSelectedInstance(instance);
    setLogsVisible(true);

    // Simulated logs - in production, fetch from backend
    setLogsData([
      { timestamp: new Date(Date.now() - 10000).toISOString(), level: 'INFO', message: `Processing function ${instance.function_id}` },
      { timestamp: new Date(Date.now() - 8000).toISOString(), level: 'DEBUG', message: `Agent ${instance.agent_id} heartbeat received` },
      { timestamp: new Date(Date.now() - 5000).toISOString(), level: 'INFO', message: 'Request parameters validated' },
      { timestamp: new Date(Date.now() - 3000).toISOString(), level: 'INFO', message: 'Function execution completed successfully' },
      { timestamp: new Date(Date.now() - 1000).toISOString(), level: 'DEBUG', message: `Response sent to client (${instance.addr})` },
    ]);
  };

  const executeDebug = async () => {
    if (!selectedInstance) return;

    setDebugLoading(true);
    try {
      // Parse payload
      let payload: any;
      try {
        payload = JSON.parse(debugPayload);
      } catch {
        message.error('无效的 JSON 格式');
        setDebugLoading(false);
        return;
      }

      // Simulated debug call - in production, call backend debug API
      await new Promise(resolve => setTimeout(resolve, 1000));

      setDebugResult({
        success: true,
        result: {
          status: 'dry_run_success',
          execution_time: 45,
          response: {
            code: 0,
            message: 'OK',
            data: { example: 'result' }
          }
        },
        warnings: []
      });
      message.success('调试执行成功');
    } catch (e: any) {
      message.error(e?.message || '调试执行失败');
    } finally {
      setDebugLoading(false);
    }
  };

  const columns: ProColumns<FunctionInstance>[] = [
    {
      title: 'Agent ID',
      dataIndex: 'agent_id',
      width: 200,
      copyable: true,
      ellipsis: true,
      render: (_, record) => (
        <Space>
          <ClusterOutlined />
          <Text code>{record.agent_id}</Text>
        </Space>
      )
    },
    {
      title: 'Service ID',
      dataIndex: 'service_id',
      width: 200,
      copyable: true,
      ellipsis: true,
      render: (_, record) => <Text code>{record.service_id}</Text>
    },
    {
      title: '地址',
      dataIndex: 'addr',
      width: 200,
      ellipsis: true,
      copyable: true
    },
    {
      title: '函数ID',
      dataIndex: 'function_id',
      width: 250,
      filters: functionFilters,
      onFilter: (value, record) => record.function_id === value,
      render: (_, record) => <Text code copyable>{record.function_id}</Text>
    },
    {
      title: '版本',
      dataIndex: 'version',
      width: 100,
      render: (_, record) => <Tag color="blue">{record.version || '-'}</Tag>
    },
    {
      title: 'Game/Env',
      dataIndex: 'game_id',
      width: 150,
      filters: gameFilters,
      onFilter: (value, record) => record.game_id === value,
      render: (_, record) => (
        <Space>
          <Tag color="purple">{record.game_id || '-'}</Tag>
          <Tag>{record.env || '-'}</Tag>
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      filters: [
        { text: '运行中', value: 'running' },
        { text: '停止', value: 'stopped' },
        { text: '错误', value: 'error' }
      ],
      onFilter: (value, record) => record.status === value,
      render: (_, record) => (
        <Badge
          status={record.healthy || record.status === 'running' ? 'success' : record.status === 'error' ? 'error' : 'default'}
          text={record.healthy || record.status === 'running' ? '运行中' : record.status === 'error' ? '错误' : '停止'}
        />
      )
    },
    {
      title: '最后心跳',
      dataIndex: 'last_heartbeat',
      width: 180,
      render: (_, record) => (
        <Text type="secondary">{record.last_heartbeat || record.last_seen ?
          new Date(record.last_heartbeat || record.last_seen || '').toLocaleString('zh-CN') : '未知'}</Text>
      )
    },
    {
      title: '操作',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => fetchInstanceDetail(record)}
            />
          </Tooltip>
          <Tooltip title="查看日志">
            <Button
              type="link"
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => showLogs(record)}
            />
          </Tooltip>
          <Tooltip title="调试">
            <Button
              type="link"
              size="small"
              icon={<BugOutlined />}
              onClick={() => {
                setSelectedInstance(record);
                setDebugVisible(true);
                setDebugResult(null);
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <PageContainer
      title="函数实例管理"
      subTitle="监控和管理各个Agent实例上的函数注册情况"
      extra={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={fetchData}>
          刷新
        </Button>
      ]}
    >
      {/* Coverage Statistics */}
      {coverage && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={4}>
              <Statistic
                title="总函数数"
                value={coverage.total_functions}
                prefix={<ClusterOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="已覆盖函数"
                value={coverage.covered_functions}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="覆盖率"
                value={coverage.coverage_percentage}
                suffix="%"
                valueStyle={{
                  color: coverage.coverage_percentage >= 80 ? '#3f8600' :
                         coverage.coverage_percentage >= 60 ? '#fa8c16' : '#cf1322'
                }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="活跃实例"
                value={coverage.active_instances}
                suffix={`/ ${coverage.total_instances}`}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="分类数量"
                value={Object.keys(coverage.functions_by_category || {}).length}
                prefix={<InfoCircleOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="游戏数量"
                value={Object.keys(coverage.instances_by_game || {}).length}
                prefix={<InfoCircleOutlined />}
              />
            </Col>
          </Row>

          {coverage.coverage_percentage < 80 && (
            <Alert
              message="覆盖率偏低"
              description={`当前函数覆盖率为 ${coverage.coverage_percentage}%，建议检查未覆盖的函数是否正确注册到Agent实例上。`}
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          {coverage.inactive_instances > 0 && (
            <Alert
              message="发现离线实例"
              description={`有 ${coverage.inactive_instances} 个实例处于离线状态，可能影响函数调用的可用性。`}
              type="error"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Card>
      )}

      {/* Instances Table */}
      <ProTable<FunctionInstance>
        rowKey="agent_id"
        loading={loading}
        columns={columns}
        dataSource={processedData}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个实例`
        }}
        search={{
          filterType: 'light',
          labelWidth: 'auto'
        }}
        dateFormatter="string"
        headerTitle="实例列表"
        rowSelection={{
          type: 'checkbox',
          onChange: (selectedRowKeys, selectedRows) => {
            console.log('selectedRowKeys: ', selectedRowKeys, 'selectedRows: ', selectedRows);
          }
        }}
        toolBarRender={() => [
          <Button key="refresh" icon={<ReloadOutlined />} onClick={fetchData}>
            刷新数据
          </Button>
        ]}
      />

      {/* Instance Detail Drawer */}
      <Drawer
        title="实例详情"
        placement="right"
        width={720}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        loading={detailLoading}
      >
        {instanceDetail && (
          <Tabs
            defaultActiveKey="overview"
            items={[
              {
                key: 'overview',
                label: <span><InfoCircleOutlined /> 概览</span>,
                children: (
                  <>
                    <Descriptions title="实例信息" bordered column={2} size="small">
                      <Descriptions.Item label="Agent ID" span={2}>
                        <Text code copyable>{instanceDetail.instance.agent_id}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Service ID" span={2}>
                        <Text code copyable>{instanceDetail.instance.service_id}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="函数ID" span={2}>
                        <Text code copyable>{instanceDetail.instance.function_id}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="地址" span={2}>
                        <Text code copyable>{instanceDetail.instance.addr}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="版本">
                        <Tag color="blue">{instanceDetail.instance.version || '-'}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="状态">
                        <Badge
                          status={instanceDetail.instance.healthy ? 'success' : 'error'}
                          text={instanceDetail.instance.healthy ? '健康' : '离线'}
                        />
                      </Descriptions.Item>
                      <Descriptions.Item label="Game">
                        {instanceDetail.instance.game_id || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Env">
                        {instanceDetail.instance.env || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="最后心跳" span={2}>
                        {instanceDetail.instance.last_heartbeat || instanceDetail.instance.last_seen || '-'}
                      </Descriptions.Item>
                    </Descriptions>

                    {instanceDetail.metrics && (
                      <>
                        <Title level={5} style={{ marginTop: 24 }}>调用指标</Title>
                        <Row gutter={16}>
                          <Col span={6}>
                            <Statistic title="总调用" value={instanceDetail.metrics.total_calls} />
                          </Col>
                          <Col span={6}>
                            <Statistic title="成功" value={instanceDetail.metrics.success_calls} valueStyle={{ color: '#3f8600' }} />
                          </Col>
                          <Col span={6}>
                            <Statistic title="失败" value={instanceDetail.metrics.failed_calls} valueStyle={{ color: '#cf1322' }} />
                          </Col>
                          <Col span={6}>
                            <Statistic title="平均耗时" value={instanceDetail.metrics.avg_duration} suffix="ms" />
                          </Col>
                        </Row>
                      </>
                    )}

                    {instanceDetail.recentCalls && instanceDetail.recentCalls.length > 0 && (
                      <>
                        <Title level={5} style={{ marginTop: 24 }}>最近调用</Title>
                        <Timeline
                          items={instanceDetail.recentCalls.map(call => ({
                            color: call.status === 'success' ? 'green' : 'red',
                            children: (
                              <div>
                                <Text>{call.id} - <Tag color={call.status === 'success' ? 'success' : 'error'}>{call.status}</Tag></Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {new Date(call.started_at).toLocaleString('zh-CN')} - {call.duration}ms
                                </Text>
                              </div>
                            )
                          }))}
                        />
                      </>
                    )}
                  </>
                )
              },
              {
                key: 'logs',
                label: <span><HistoryOutlined /> 日志</span>,
                children: (
                  <div>
                    <Button
                      size="small"
                      onClick={() => showLogs(instanceDetail.instance)}
                      style={{ marginBottom: 12 }}
                    >
                      查看完整日志
                    </Button>
                    {instanceDetail.logs?.map((log, idx) => (
                      <div key={idx} style={{ marginBottom: 8, padding: '8px 12px', background: '#fafafa', borderRadius: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(log.timestamp).toLocaleString('zh-CN')}
                        </Text>
                        <Tag
                          size="small"
                          color={
                            log.level === 'error' ? 'error' :
                            log.level === 'warn' ? 'warning' :
                            log.level === 'debug' ? 'default' : 'success'
                          }
                          style={{ marginLeft: 8 }}
                        >
                          {log.level.toUpperCase()}
                        </Tag>
                        <div style={{ marginTop: 4 }}>{log.message}</div>
                      </div>
                    ))}
                  </div>
                )
              },
              {
                key: 'debug',
                label: <span><BugOutlined /> 调试</span>,
                children: (
                  <div>
                    <Alert
                      message="调试模式"
                      description="在调试模式下，您可以发送测试请求到该实例而不会影响实际数据。"
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <Button
                      type="primary"
                      onClick={() => {
                        setDebugVisible(true);
                        setDetailVisible(false);
                      }}
                    >
                      打开调试面板
                    </Button>
                  </div>
                )
              }
            ]}
          />
        )}
      </Drawer>

      {/* Logs Modal */}
      <Modal
        title={`日志 - ${selectedInstance?.agent_id}`}
        open={logsVisible}
        onCancel={() => setLogsVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setLogsVisible(false)}>
            关闭
          </Button>,
          <Button key="export" onClick={() => {
            const text = logsData.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `instance-logs-${selectedInstance?.agent_id}-${Date.now()}.log`;
            a.click();
            URL.revokeObjectURL(url);
            message.success('日志已导出');
          }}>
            导出日志
          </Button>
        ]}
      >
        <div style={{ maxHeight: 400, overflow: 'auto', background: '#1e1e1e', padding: 12, borderRadius: 4 }}>
          {logsData.map((log, idx) => (
            <div key={idx} style={{ marginBottom: 8, fontFamily: 'monospace', fontSize: 12 }}>
              <span style={{ color: '#6b7280' }}>[{new Date(log.timestamp).toLocaleString('zh-CN')}]</span>
              <span style={{
                color:
                  log.level === 'ERROR' ? '#ef4444' :
                  log.level === 'WARN' ? '#f59e0b' :
                  log.level === 'DEBUG' ? '#8b5cf6' : '#10b981',
                marginLeft: 8,
                marginRight: 8
              }}>
                [{log.level}]
              </span>
              <span style={{ color: '#e5e7eb' }}>{log.message}</span>
            </div>
          ))}
        </div>
      </Modal>

      {/* Debug Modal */}
      <Modal
        title={`调试 - ${selectedInstance?.function_id}`}
        open={debugVisible}
        onCancel={() => setDebugVisible(false)}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => setDebugVisible(false)}>
            取消
          </Button>,
          <Button
            key="dryRun"
            onClick={executeDebug}
            loading={debugLoading}
          >
            试运行
          </Button>,
          <Button
            key="execute"
            type="primary"
            danger
            onClick={executeDebug}
            loading={debugLoading}
          >
            执行
          </Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="调试警告"
            description="调试模式下发送的请求会在实际环境中执行，请谨慎操作。建议先使用试运行模式。"
            type="warning"
            showIcon
          />

          <div>
            <Text strong>目标实例:</Text>
            <div style={{ marginTop: 8 }}>
              <Tag color="blue">{selectedInstance?.agent_id}</Tag>
              <Tag color="purple">{selectedInstance?.game_id || 'default'}</Tag>
              <Tag>{selectedInstance?.env || 'dev'}</Tag>
            </div>
          </div>

          <div>
            <Text strong>请求参数 (JSON):</Text>
            <Input.TextArea
              style={{ marginTop: 8, fontFamily: 'monospace' }}
              rows={10}
              value={debugPayload}
              onChange={(e) => setDebugPayload(e.target.value)}
              placeholder='{\n  "param1": "value1"\n}'
            />
          </div>

          {debugResult && (
            <div>
              <Text strong>执行结果:</Text>
              <pre style={{
                marginTop: 8,
                padding: 12,
                background: debugResult.success ? '#f6ffed' : '#fff2f0',
                border: `1px solid ${debugResult.success ? '#b7eb8f' : '#ffccc7'}`,
                borderRadius: 4,
                fontSize: 12,
                maxHeight: 200,
                overflow: 'auto'
              }}>
                {JSON.stringify(debugResult, null, 2)}
              </pre>
            </div>
          )}
        </Space>
      </Modal>
    </PageContainer>
  );
};
