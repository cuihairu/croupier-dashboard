import React, { useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Drawer,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import {
  disableExtension,
  enableExtension,
  getExtensionCapabilities,
  getExtensionConfig,
  getExtensionConfigSchema,
  listExtensionCatalogReleases,
  getExtensionInstallationDetail,
  listExtensionEvents,
  listExtensionInstallations,
  reconcileExtension,
  runExtensionHealthCheck,
  uninstallExtension,
  updateExtensionConfig,
  upgradeExtension,
  testExtensionConnection,
  type ExtensionBindingItem,
  type ExtensionEventItem,
  type ExtensionInstallationItem,
} from '@/services/api/extensions';
import {
  adaptCatalogReleaseListResponse,
  adaptEventListResponse,
  adaptInstallationDetailResponse,
  adaptInstallationListResponse,
} from '@/services/adapters/extensions';
import { EXTENSION_ERROR_CODES } from '@/services/errors/codes';
import { mapExtensionError } from '@/services/errors/mapper';

const { Text } = Typography;

function formatUnix(ts?: number) {
  if (!ts) return '-';
  const ms = ts > 1e12 ? ts : ts * 1000;
  return new Date(ms).toLocaleString();
}

export default function ExtensionsInstallationsPage() {
  const access = useAccess();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ExtensionInstallationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [extensionID, setExtensionID] = useState('');

  const [eventsOpen, setEventsOpen] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventInstallationID, setEventInstallationID] = useState<number | undefined>(undefined);
  const [events, setEvents] = useState<ExtensionEventItem[]>([]);
  const [eventTotal, setEventTotal] = useState(0);
  const [eventsTitle, setEventsTitle] = useState('');
  const [eventKeyword, setEventKeyword] = useState('');
  const [eventLevel, setEventLevel] = useState<string | undefined>(undefined);
  const [eventPage, setEventPage] = useState(1);
  const [eventPageSize, setEventPageSize] = useState(10);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTarget, setDetailTarget] = useState<ExtensionInstallationItem | undefined>(
    undefined,
  );
  const [detailBindings, setDetailBindings] = useState<ExtensionBindingItem[]>([]);
  const [detailConfigSchema, setDetailConfigSchema] = useState<Record<string, any> | undefined>(
    undefined,
  );
  const [detailConfig, setDetailConfig] = useState('{}');
  const [detailSecretRefs, setDetailSecretRefs] = useState('{}');
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [capabilitiesOpen, setCapabilitiesOpen] = useState(false);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<string[]>([]);

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeID, setUpgradeID] = useState<number | undefined>(undefined);
  const [upgradeVersion, setUpgradeVersion] = useState('');
  const [upgradeOptions, setUpgradeOptions] = useState<{ label: string; value: string }[]>([]);

  const loadInstallations = async () => {
    setLoading(true);
    try {
      const resp = await listExtensionInstallations({
        extension_id: extensionID.trim() || undefined,
        status,
        page,
        page_size: pageSize,
      });
      const vm = adaptInstallationListResponse(resp);
      setItems(vm.items);
      setTotal(vm.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstallations();
  }, [extensionID, status, page, pageSize]);

  const withReload = async (fn: () => Promise<any>, successText: string) => {
    await fn();
    message.success(successText);
    await loadInstallations();
  };

  const handleUninstall = (row: ExtensionInstallationItem) => {
    Modal.confirm({
      title: '确认卸载扩展',
      content: `安装实例 #${row.id} 将被卸载，是否继续？`,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await uninstallExtension(row.id);
          message.success('已卸载扩展');
          await loadInstallations();
        } catch (err: any) {
          const uiErr = mapExtensionError(err);
          const details = uiErr.details || {};
          const blockers = Array.isArray(details.blockers) ? details.blockers : [];
          if (uiErr.code === EXTENSION_ERROR_CODES.DEPENDENCY_BLOCKED && blockers.length > 0) {
            Modal.warning({
              title: '无法卸载：存在依赖',
              content: (
                <Space direction="vertical">
                  <Text type="secondary">以下扩展仍依赖当前扩展，请先处理它们：</Text>
                  {blockers.map((item: string) => (
                    <Tag key={item} color="orange">
                      {item}
                    </Tag>
                  ))}
                </Space>
              ),
            });
            return;
          }
          message.error(uiErr.message);
        }
      },
    });
  };

  const openEvents = async (row: ExtensionInstallationItem) => {
    setEventsOpen(true);
    setEventInstallationID(row.id);
    setEventKeyword('');
    setEventLevel(undefined);
    setEventPage(1);
    setEventsTitle(`${row.display_name || row.extension_id} (#${row.id})`);
  };

  const loadEvents = async () => {
    if (!eventsOpen || !eventInstallationID) return;
    setEventLoading(true);
    try {
      const resp = await listExtensionEvents(eventInstallationID, {
        level: eventLevel,
        keyword: eventKeyword.trim() || undefined,
        page: eventPage,
        page_size: eventPageSize,
      });
      const vm = adaptEventListResponse(resp);
      setEvents(vm.items);
      setEventTotal(vm.total);
    } finally {
      setEventLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [eventsOpen, eventInstallationID, eventLevel, eventKeyword, eventPage, eventPageSize]);

  const openDetail = async (row: ExtensionInstallationItem) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailTarget(undefined);
    setDetailBindings([]);
    setDetailConfigSchema(undefined);
    setDetailConfig('{}');
    setDetailSecretRefs('{}');
    try {
      const resp = await getExtensionInstallationDetail(row.id);
      const vm = adaptInstallationDetailResponse(resp, row);
      const detail = vm.installation;
      setDetailTarget(detail);
      setDetailBindings(vm.bindings);
      const schemaResp = await getExtensionConfigSchema(row.id).catch(() => null);
      setDetailConfigSchema(schemaResp?.schema || undefined);
      const configResp = await getExtensionConfig(row.id).catch(() => null);
      const finalConfig = configResp?.config ?? vm.config;
      const finalSecretRefs = configResp?.secret_refs ?? vm.secretRefs;
      setDetailConfig(JSON.stringify(finalConfig, null, 2));
      setDetailSecretRefs(JSON.stringify(finalSecretRefs, null, 2));
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: ColumnsType<ExtensionInstallationItem> = [
    {
      title: '安装实例',
      dataIndex: 'display_name',
      key: 'display_name',
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{row.display_name || row.extension_id}</Text>
          <Text type="secondary">
            #{row.id} / {row.installation_key}
          </Text>
        </Space>
      ),
    },
    {
      title: '版本',
      dataIndex: 'release_version',
      key: 'release_version',
      width: 120,
    },
    {
      title: '状态',
      key: 'status',
      width: 150,
      render: (_, row) => (
        <Space>
          <Tag color={row.enabled ? 'green' : 'default'}>{row.enabled ? '启用' : '禁用'}</Tag>
          <Tag>{row.status || '-'}</Tag>
        </Space>
      ),
    },
    {
      title: '健康',
      dataIndex: 'health_status',
      key: 'health_status',
      width: 120,
      render: (value) => (
        <Tag color={value === 'healthy' ? 'green' : value === 'error' ? 'red' : 'default'}>
          {value || '-'}
        </Tag>
      ),
    },
    {
      title: 'Scope/Target',
      key: 'scope_target',
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text>
            {row.scope_type}:{row.scope_id}
          </Text>
          <Text type="secondary">
            {row.target_type}:{row.target_id || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 170,
      render: (v) => formatUnix(v),
    },
    {
      title: '操作',
      key: 'actions',
      width: 360,
      render: (_, row) => (
        <Space wrap>
          <Button size="small" onClick={() => openDetail(row)}>
            详情
          </Button>
          <Button size="small" onClick={() => openEvents(row)}>
            事件
          </Button>
          <Button
            size="small"
            disabled={!access.canExtensionsManage}
            onClick={() =>
              withReload(
                () => (row.enabled ? disableExtension(row.id) : enableExtension(row.id)),
                row.enabled ? '已禁用扩展' : '已启用扩展',
              )
            }
          >
            {row.enabled ? '禁用' : '启用'}
          </Button>
          <Button
            size="small"
            disabled={!access.canExtensionsManage}
            onClick={async () => {
              setUpgradeID(row.id);
              setUpgradeVersion('');
              setUpgradeOptions([]);
              setUpgradeOpen(true);
              setUpgradeLoading(true);
              try {
                const resp = await listExtensionCatalogReleases(row.extension_id);
                const releaseVM = adaptCatalogReleaseListResponse(resp);
                const options = releaseVM.releases.map((r) => ({
                  label: r.version,
                  value: r.version,
                }));
                setUpgradeOptions(options);
                const hasCurrent = options.some((o) => o.value === row.release_version);
                if (!hasCurrent && row.release_version) {
                  setUpgradeOptions([
                    { label: row.release_version, value: row.release_version },
                    ...options,
                  ]);
                }
              } finally {
                setUpgradeLoading(false);
              }
            }}
          >
            升级
          </Button>
          <Button
            size="small"
            disabled={!access.canExtensionsManage}
            onClick={() => withReload(() => reconcileExtension(row.id), '已触发重建绑定')}
          >
            重建绑定
          </Button>
          <Button
            size="small"
            danger
            disabled={!access.canExtensionsManage}
            onClick={() => handleUninstall(row)}
          >
            卸载
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="扩展安装" subTitle="查看和管理已安装扩展实例">
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            style={{ width: 240 }}
            allowClear
            placeholder="扩展 ID"
            value={extensionID}
            onChange={(e) => {
              setPage(1);
              setExtensionID(e.target.value);
            }}
          />
          <Select
            style={{ width: 160 }}
            allowClear
            placeholder="状态"
            value={status}
            onChange={(v) => {
              setPage(1);
              setStatus(v);
            }}
            options={[
              { label: 'installing', value: 'installing' },
              { label: 'running', value: 'running' },
              { label: 'disabled', value: 'disabled' },
              { label: 'error', value: 'error' },
              { label: 'uninstalling', value: 'uninstalling' },
            ]}
          />
          <Button onClick={loadInstallations}>刷新</Button>
        </Space>

        <Table<ExtensionInstallationItem>
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </Card>

      <Drawer
        open={eventsOpen}
        onClose={() => setEventsOpen(false)}
        width={760}
        title={`扩展事件: ${eventsTitle}`}
      >
        <Space style={{ marginBottom: 12 }} wrap>
          <Input
            allowClear
            style={{ width: 260 }}
            placeholder="筛选事件/内容/操作者"
            value={eventKeyword}
            onChange={(e) => {
              setEventPage(1);
              setEventKeyword(e.target.value);
            }}
          />
          <Select
            allowClear
            style={{ width: 140 }}
            placeholder="级别"
            value={eventLevel}
            onChange={(v) => {
              setEventPage(1);
              setEventLevel(v);
            }}
            options={[
              { label: 'info', value: 'info' },
              { label: 'warn', value: 'warn' },
              { label: 'error', value: 'error' },
            ]}
          />
          <Button
            onClick={() => {
              setEventKeyword('');
              setEventLevel(undefined);
              setEventPage(1);
            }}
          >
            重置
          </Button>
        </Space>

        <Table<ExtensionEventItem>
          rowKey={(row, idx) => `${row.created_at}-${row.event_type}-${idx}`}
          loading={eventLoading}
          dataSource={events}
          pagination={{
            current: eventPage,
            pageSize: eventPageSize,
            total: eventTotal,
            showSizeChanger: true,
            onChange: (nextPage, nextPageSize) => {
              setEventPage(nextPage);
              setEventPageSize(nextPageSize);
            },
          }}
          columns={[
            {
              title: '时间',
              dataIndex: 'created_at',
              key: 'created_at',
              render: (v) => formatUnix(v),
            },
            { title: '级别', dataIndex: 'level', key: 'level', width: 100 },
            { title: '事件', dataIndex: 'event_type', key: 'event_type', width: 150 },
            { title: '内容', dataIndex: 'message', key: 'message' },
            {
              title: 'Payload',
              dataIndex: 'payload',
              key: 'payload',
              render: (value: string) =>
                value ? (
                  <Typography.Text code ellipsis={{ tooltip: value }} style={{ maxWidth: 260 }}>
                    {value}
                  </Typography.Text>
                ) : (
                  '-'
                ),
            },
            { title: '操作者', dataIndex: 'created_by', key: 'created_by', width: 120 },
          ]}
        />
      </Drawer>

      <Modal
        open={upgradeOpen}
        title="升级扩展"
        onCancel={() => setUpgradeOpen(false)}
        onOk={async () => {
          if (!upgradeID) return;
          if (!upgradeVersion.trim()) {
            message.warning('请输入目标版本');
            return;
          }
          setUpgrading(true);
          try {
            await upgradeExtension(upgradeID, upgradeVersion.trim());
            message.success('升级请求已提交');
            setUpgradeOpen(false);
            await loadInstallations();
          } catch (err: any) {
            const uiErr = mapExtensionError(err);
            const details = uiErr.details || {};
            if (uiErr.code === EXTENSION_ERROR_CODES.MISSING_DEPENDENCY) {
              message.error(`升级失败，缺少依赖扩展：${details.dependency || 'unknown'}`);
              return;
            }
            if (uiErr.code === EXTENSION_ERROR_CODES.VERSION_MISMATCH) {
              message.error(
                `升级失败，依赖版本不匹配：${details.dependency || 'unknown'}，要求 ${
                  details.required_version || '-'
                }，当前 ${details.current_version || '-'}`,
              );
              return;
            }
            if (uiErr.code === EXTENSION_ERROR_CODES.DEPENDENCY_CYCLE) {
              message.error(`升级失败，检测到循环依赖：${details.dependency || 'unknown'}`);
              return;
            }
            message.error(uiErr.message);
          } finally {
            setUpgrading(false);
          }
        }}
        okButtonProps={{ loading: upgrading }}
      >
        <Select
          showSearch
          loading={upgradeLoading}
          options={upgradeOptions}
          value={upgradeVersion}
          onChange={(value) => setUpgradeVersion(value)}
          placeholder="选择目标版本"
          style={{ width: '100%' }}
        />
      </Modal>

      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={860}
        title={`安装详情: ${detailTarget?.display_name || detailTarget?.extension_id || ''}`}
        extra={
          <Space>
            <Button
              loading={checkingHealth}
              disabled={!access.canExtensionsManage}
              onClick={async () => {
                if (!detailTarget) return;
                setCheckingHealth(true);
                try {
                  const resp = await runExtensionHealthCheck(detailTarget.id);
                  message.success(`健康检查完成: ${resp?.status || 'unknown'}`);
                } finally {
                  setCheckingHealth(false);
                }
              }}
            >
              健康检查
            </Button>
            <Button
              loading={capabilitiesLoading}
              onClick={async () => {
                if (!detailTarget) return;
                setCapabilitiesLoading(true);
                try {
                  const resp = await getExtensionCapabilities(detailTarget.id);
                  setCapabilities(resp?.capabilities || []);
                  setCapabilitiesOpen(true);
                } finally {
                  setCapabilitiesLoading(false);
                }
              }}
            >
              查看能力
            </Button>
            <Button
              loading={testingConnection}
              disabled={!access.canExtensionsManage}
              onClick={async () => {
                if (!detailTarget) return;
                setTestingConnection(true);
                try {
                  await testExtensionConnection(detailTarget.id);
                  message.success('连接测试通过');
                } finally {
                  setTestingConnection(false);
                }
              }}
            >
              测试连接
            </Button>
            <Button
              type="primary"
              loading={savingConfig}
              disabled={!access.canExtensionsManage}
              onClick={async () => {
                if (!detailTarget) return;
                let config: Record<string, any>;
                let secretRefs: Record<string, string>;
                try {
                  config = JSON.parse(detailConfig || '{}');
                } catch {
                  message.error('配置 JSON 格式错误');
                  return;
                }
                try {
                  secretRefs = JSON.parse(detailSecretRefs || '{}');
                } catch {
                  message.error('SecretRefs JSON 格式错误');
                  return;
                }
                setSavingConfig(true);
                try {
                  await updateExtensionConfig(detailTarget.id, { config, secret_refs: secretRefs });
                  message.success('配置已保存');
                  await loadInstallations();
                } finally {
                  setSavingConfig(false);
                }
              }}
            >
              保存配置
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {detailLoading && <Text type="secondary">加载中...</Text>}
          {!detailLoading && detailTarget && (
            <>
              <Card size="small" title="基本信息">
                <Space direction="vertical">
                  <Text>
                    <Text strong>ID: </Text>#{detailTarget.id}
                  </Text>
                  <Text>
                    <Text strong>扩展: </Text>
                    {detailTarget.display_name || detailTarget.extension_id} (
                    {detailTarget.extension_id})
                  </Text>
                  <Text>
                    <Text strong>版本: </Text>
                    {detailTarget.release_version}
                  </Text>
                  <Text>
                    <Text strong>Scope/Target: </Text>
                    {detailTarget.scope_type}:{detailTarget.scope_id} / {detailTarget.target_type}:
                    {detailTarget.target_id || '-'}
                  </Text>
                </Space>
              </Card>

              <Card size="small" title="配置 JSON">
                <Input.TextArea
                  rows={8}
                  value={detailConfig}
                  onChange={(e) => setDetailConfig(e.target.value)}
                />
              </Card>

              <Card size="small" title="配置 Schema 预览">
                {detailConfigSchema?.properties &&
                typeof detailConfigSchema.properties === 'object' ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {Object.entries(detailConfigSchema.properties).map(([key, raw]) => {
                      const field = (raw || {}) as Record<string, any>;
                      const required = Array.isArray(detailConfigSchema.required)
                        ? detailConfigSchema.required.includes(key)
                        : false;
                      return (
                        <Space key={key} wrap>
                          <Typography.Text strong>{String(field.title || key)}</Typography.Text>
                          <Tag color="blue">{String(field.type || 'any')}</Tag>
                          {required && <Tag color="red">required</Tag>}
                          {field.description && (
                            <Typography.Text type="secondary">
                              {String(field.description)}
                            </Typography.Text>
                          )}
                        </Space>
                      );
                    })}
                  </Space>
                ) : (
                  <Text type="secondary">无 schema 数据</Text>
                )}
              </Card>

              <Card size="small" title="Secret Refs JSON">
                <Input.TextArea
                  rows={6}
                  value={detailSecretRefs}
                  onChange={(e) => setDetailSecretRefs(e.target.value)}
                />
              </Card>

              <Card size="small" title="Runtime Bindings">
                <Table<ExtensionBindingItem>
                  rowKey={(row, idx) => `${row.binding_type}-${row.binding_key}-${idx}`}
                  dataSource={detailBindings}
                  pagination={false}
                  size="small"
                  columns={[
                    { title: 'Type', dataIndex: 'binding_type', key: 'binding_type', width: 130 },
                    { title: 'Key', dataIndex: 'binding_key', key: 'binding_key', width: 220 },
                    { title: 'Target', dataIndex: 'target_ref', key: 'target_ref' },
                    { title: 'Status', dataIndex: 'status', key: 'status', width: 120 },
                    { title: 'Error', dataIndex: 'last_error', key: 'last_error' },
                  ]}
                />
              </Card>
            </>
          )}
        </Space>
      </Drawer>

      <Modal
        open={capabilitiesOpen}
        title="扩展能力列表"
        onCancel={() => setCapabilitiesOpen(false)}
        footer={null}
      >
        <Space wrap>
          {capabilities.length === 0 && <Text type="secondary">暂无能力数据</Text>}
          {capabilities.map((cap) => (
            <Tag key={cap} color="blue">
              {cap}
            </Tag>
          ))}
        </Space>
      </Modal>
    </PageContainer>
  );
}
