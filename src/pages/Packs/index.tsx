import React, { useEffect, useMemo, useState } from 'react';
import { PageContainer, ProTable, ProColumns } from '@ant-design/pro-components';
import {
  Card,
  Space,
  Typography,
  Button,
  Tag,
  Badge,
  Tooltip,
  Modal,
  Descriptions,
  Tabs,
  List,
  Drawer,
  Alert,
  Row,
  Col,
  Statistic,
  Progress,
  Upload,
  message,
  Popconfirm,
  Switch,
  InputNumber,
  Form,
  Select,
  Timeline,
} from 'antd';
import {
  ReloadOutlined,
  DownloadOutlined,
  UploadOutlined,
  EyeOutlined,
  HistoryOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  CodeOutlined,
  RocketOutlined,
  PlusOutlined,
  AppstoreOutlined,
  InboxOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import { getMessage } from '@/utils/antdApp';
import GameSelector from '@/components/GameSelector';
import {
  listPacks,
  reloadPacks,
  getPacksExportUrl,
  PackManifest,
  PackVersion,
  PackHistory,
  PackCanaryConfig,
} from '@/services/api';
import { useModel } from '@umijs/max';

type PackItem = {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  status: 'active' | 'canary' | 'disabled' | 'deprecated';
  functionsCount: number;
  entitiesCount: number;
  canary?: PackCanaryConfig;
  uploadedAt: string;
  uploadedBy: string;
  size: string;
};

type VersionHistoryItem = {
  id: string;
  version: string;
  changelog: string;
  deployedAt: string;
  deployedBy: string;
  status: 'stable' | 'canary' | 'rollback';
};

export default function PacksPage() {
  const [loading, setLoading] = useState(false);
  const [manifest, setManifest] = useState<any>({});
  const [counts, setCounts] = useState<{ descriptors: number; ui_schema: number }>({
    descriptors: 0,
    ui_schema: 0,
  });
  const [etag, setEtag] = useState<string | undefined>(undefined);
  const [exportAuthRequired, setExportAuthRequired] = useState<boolean>(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedPack, setSelectedPack] = useState<PackItem | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [canaryModalVisible, setCanaryModalVisible] = useState(false);
  const [packContent, setPackContent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const { initialState } = useModel('@@initialState');
  const roles = useMemo(() => {
    const acc = (initialState as any)?.currentUser?.access as string | undefined;
    return (acc ? acc.split(',') : []).filter(Boolean);
  }, [initialState]);
  const canReload = roles.includes('*') || roles.includes('packs:reload');
  const canExport = roles.includes('*') || roles.includes('packs:export');
  const canUpload = roles.includes('*') || roles.includes('packs:upload');

  // Convert manifest to pack items
  const packItems = useMemo(() => {
    const items: PackItem[] = [];
    const functions = manifest.functions || [];
    const entities = manifest.entities || [];

    // Group by provider/source to create pack items
    const providerMap = new Map<string, any>();

    functions.forEach((fn: any) => {
      const provider = fn.provider || 'default';
      if (!providerMap.has(provider)) {
        providerMap.set(provider, {
          id: provider,
          name: fn.display_name?.en || fn.display_name?.zh || provider,
          version: fn.version || '1.0.0',
          category: fn.category || 'general',
          description: fn.summary?.en || fn.summary?.zh || '',
          status: 'active',
          functionsCount: 0,
          entitiesCount: 0,
        });
      }
      const pack = providerMap.get(provider);
      pack.functionsCount++;
    });

    entities.forEach((ent: any) => {
      const provider = ent.provider || 'default';
      if (providerMap.has(provider)) {
        providerMap.get(provider).entitiesCount++;
      }
    });

    providerMap.forEach((pack) => {
      items.push({
        ...pack,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'system',
        size: `${Math.round(Math.random() * 500 + 50)}KB`,
      });
    });

    return items;
  }, [manifest]);

  // Statistics
  const stats = useMemo(() => {
    return {
      totalPacks: packItems.length,
      totalFunctions: counts.descriptors,
      totalEntities: manifest.entities?.length || 0,
      activePacks: packItems.filter((p) => p.status === 'active').length,
      canaryPacks: packItems.filter((p) => p.status === 'canary').length,
    };
  }, [packItems, counts, manifest]);

  async function load() {
    setLoading(true);
    try {
      const res = await listPacks();
      setManifest(res.manifest || {});
      setCounts(res.counts || { descriptors: 0, ui_schema: 0 });
      setEtag((res as any).etag || undefined);
      setExportAuthRequired(!!(res as any).export_auth_required);
    } catch (e: any) {
      getMessage()?.error(e?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const onReload = async () => {
    setLoading(true);
    try {
      await reloadPacks();
      getMessage()?.success('Packs reloaded successfully');
      await load();
    } catch (e: any) {
      getMessage()?.error(e?.message || 'Reload failed');
    } finally {
      setLoading(false);
    }
  };

  const showPackDetail = (pack: PackItem) => {
    setSelectedPack(pack);

    // Mock pack content
    setPackContent({
      manifest: {
        id: pack.id,
        name: pack.name,
        version: pack.version,
        description: pack.description,
        provider: {
          id: pack.id,
          lang: 'go',
          sdk: 'croupier-go',
        },
      },
      functions: manifest.functions?.filter((fn: any) => fn.provider === pack.id) || [],
      entities: manifest.entities?.filter((ent: any) => ent.provider === pack.id) || [],
      schemas: manifest.schemas || [],
      uiPlugins: manifest.ui_plugins || [],
    });

    setDetailVisible(true);
  };

  const showVersionHistory = (pack: PackItem) => {
    setSelectedPack(pack);

    // Mock version history
    setVersionHistory([
      {
        id: '1',
        version: pack.version,
        changelog: '初始版本发布',
        deployedAt: new Date(Date.now() - 86400000).toISOString(),
        deployedBy: 'admin',
        status: 'stable',
      },
      {
        id: '2',
        version: '1.1.0',
        changelog: '新增 player.unban 函数\n优化 UI 性能',
        deployedAt: new Date(Date.now() - 172800000).toISOString(),
        deployedBy: 'admin',
        status: 'stable',
      },
      {
        id: '3',
        version: '1.2.0-canary',
        changelog: '灰度测试中\n新增批量操作支持',
        deployedAt: new Date(Date.now() - 3600000).toISOString(),
        deployedBy: 'admin',
        status: 'canary',
      },
    ]);

    setHistoryVisible(true);
  };

  const onRollback = (version: string) => {
    Modal.confirm({
      title: '回滚版本',
      content: `确定要回滚到版本 ${version} 吗？此操作将立即生效。`,
      onOk: async () => {
        message.success(`已回滚到版本 ${version}`);
        setHistoryVisible(false);
        load();
      },
    });
  };

  const onUpload = (file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('game_id', localStorage.getItem('game_id') || '');
    formData.append('env', localStorage.getItem('env') || 'prod');

    // Mock upload
    message.loading('正在上传包...');
    setTimeout(() => {
      message.destroy();
      message.success('包上传成功');
      setUploadModalVisible(false);
      load();
    }, 2000);
  };

  const columns: ProColumns<PackItem>[] = [
    {
      title: '包ID',
      dataIndex: 'id',
      width: 200,
      copyable: true,
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
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 120,
      render: (text) => <Tag>{text}</Tag>,
    },
    {
      title: '函数数',
      dataIndex: 'functionsCount',
      width: 100,
      render: (text) => (
        <Badge count={text} showZero style={{ backgroundColor: '#52c41a' }} />
      ),
    },
    {
      title: '实体数',
      dataIndex: 'entitiesCount',
      width: 100,
      render: (text) => (
        <Badge count={text} showZero style={{ backgroundColor: '#1890ff' }} />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (text) => {
        const config = {
          active: { color: 'success', text: '活跃' },
          canary: { color: 'processing', text: '灰度' },
          disabled: { color: 'default', text: '禁用' },
          deprecated: { color: 'error', text: '废弃' },
        } as const;
        const c = config[text as keyof typeof config] || config.disabled;
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
    {
      title: '大小',
      dataIndex: 'size',
      width: 100,
    },
    {
      title: '更新时间',
      dataIndex: 'uploadedAt',
      width: 180,
      render: (text) => (text ? new Date(text).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => showPackDetail(record)} />
          </Tooltip>
          <Tooltip title="版本历史">
            <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => showVersionHistory(record)} />
          </Tooltip>
          {record.status === 'active' && (
            <Tooltip title="灰度发布">
              <Button
                type="link"
                size="small"
                icon={<ExperimentOutlined />}
                onClick={() => {
                  setSelectedPack(record);
                  setCanaryModalVisible(true);
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="包管理"
      subTitle="管理函数包的版本、发布和灰度"
      extra={[
        <GameSelector key="game" />,
        <Button key="upload" type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalVisible(true)} disabled={!canUpload}>
          上传包
        </Button>,
      ]}
    >
      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card>
            <Statistic title="总包数" value={stats.totalPacks} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="活跃包" value={stats.activePacks} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="灰度包" value={stats.canaryPacks} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="总函数" value={stats.totalFunctions} prefix={<CodeOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="总实体" value={stats.totalEntities} prefix={<InboxOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="UI Schema"
              value={counts.ui_schema}
              prefix={<FileTextOutlined />}
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
              key: 'overview',
              label: '包列表',
              children: (
                <ProTable<PackItem>
                  rowKey="id"
                  columns={columns}
                  dataSource={packItems}
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                  }}
                  search={false}
                  rowSelection={{
                    type: 'checkbox',
                  }}
                  toolBarRender={() => [
                    canReload ? (
                      <Button key="reload" icon={<ReloadOutlined />} onClick={onReload} loading={loading}>
                        重载
                      </Button>
                    ) : null,
                    canExport ? (
                      <Button
                        key="export"
                        icon={<DownloadOutlined />}
                        onClick={() => {
                          window.location.href = getPacksExportUrl();
                        }}
                      >
                        导出
                      </Button>
                    ) : exportAuthRequired ? (
                      <Tooltip key="export-no-auth" title="需要 packs:export 权限">
                        <Button icon={<DownloadOutlined />} disabled>
                          导出
                        </Button>
                      </Tooltip>
                    ) : null,
                    <Button key="refresh" icon={<ReloadOutlined />} onClick={load} loading={loading}>
                      刷新
                    </Button>,
                  ]}
                />
              ),
            },
            {
              key: 'manifest',
              label: 'Manifest JSON',
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Alert
                    message="当前加载的 manifest.json"
                    description={etag ? `ETag: ${etag.slice(0, 12)}...` : undefined}
                    type="info"
                    showIcon
                  />
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      background: '#1e1e1e',
                      color: '#d4d4d4',
                      padding: 16,
                      borderRadius: 4,
                      fontSize: 12,
                      maxHeight: 500,
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(manifest, null, 2)}
                  </pre>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* Pack Detail Drawer */}
      <Drawer
        title={`包详情 - ${selectedPack?.name || selectedPack?.id}`}
        placement="right"
        width={720}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
      >
        {selectedPack && packContent && (
          <Tabs
            defaultActiveKey="overview"
            items={[
              {
                key: 'overview',
                label: '概览',
                children: (
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="包ID" span={2}>
                      <Typography.Text copyable>{selectedPack.id}</Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="名称" span={2}>
                      {selectedPack.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="版本">
                      <Tag color="blue">{selectedPack.version}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="分类">
                      <Tag>{selectedPack.category}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Tag
                        color={
                          selectedPack.status === 'active'
                            ? 'success'
                            : selectedPack.status === 'canary'
                            ? 'processing'
                            : 'default'
                        }
                      >
                        {selectedPack.status}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="大小">
                      {selectedPack.size}
                    </Descriptions.Item>
                    <Descriptions.Item label="函数数量" span={2}>
                      {selectedPack.functionsCount}
                    </Descriptions.Item>
                    <Descriptions.Item label="实体数量" span={2}>
                      {selectedPack.entitiesCount}
                    </Descriptions.Item>
                    <Descriptions.Item label="上传者">
                      {selectedPack.uploadedBy}
                    </Descriptions.Item>
                    <Descriptions.Item label="上传时间">
                      {new Date(selectedPack.uploadedAt).toLocaleString('zh-CN')}
                    </Descriptions.Item>
                    <Descriptions.Item label="描述" span={2}>
                      {selectedPack.description || '-'}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'functions',
                label: `函数 (${packContent.functions?.length || 0})`,
                children: (
                  <List
                    dataSource={packContent.functions}
                    renderItem={(fn: any) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space>
                              <Typography.Text code>{fn.id}</Typography.Text>
                              <Tag color="blue">{fn.version}</Tag>
                            </Space>
                          }
                          description={fn.summary?.en || fn.summary?.zh || fn.description}
                        />
                      </List.Item>
                    )}
                  />
                ),
              },
              {
                key: 'entities',
                label: `实体 (${packContent.entities?.length || 0})`,
                children: (
                  <List
                    dataSource={packContent.entities}
                    renderItem={(ent: any) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space>
                              <Typography.Text code>{ent.id}</Typography.Text>
                              <Tag color="purple">{ent.type}</Tag>
                            </Space>
                          }
                          description={ent.description}
                        />
                      </List.Item>
                    )}
                  />
                ),
              },
              {
                key: 'schemas',
                label: `Schemas (${packContent.schemas?.length || 0})`,
                children: (
                  <List
                    dataSource={packContent.schemas}
                    renderItem={(schema: any) => (
                      <List.Item>
                        <Typography.Text code>{schema}</Typography.Text>
                      </List.Item>
                    )}
                  />
                ),
              },
            ]}
          />
        )}
      </Drawer>

      {/* Version History Modal */}
      <Modal
        title={`版本历史 - ${selectedPack?.name}`}
        open={historyVisible}
        onCancel={() => setHistoryVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setHistoryVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <Timeline>
          {versionHistory.map((item) => (
            <Timeline.Item
              key={item.id}
              color={item.status === 'stable' ? 'green' : item.status === 'canary' ? 'blue' : 'red'}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Tag color="blue">{item.version}</Tag>
                  <Tag color={item.status === 'stable' ? 'success' : item.status === 'canary' ? 'processing' : 'error'}>
                    {item.status}
                  </Tag>
                  {item.status !== 'stable' && (
                    <Button size="small" type="primary" ghost onClick={() => onRollback(item.version)}>
                      回滚到此版本
                    </Button>
                  )}
                </Space>
                <Typography.Text>{item.changelog}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  部署者: {item.deployedBy} | 时间: {new Date(item.deployedAt).toLocaleString('zh-CN')}
                </Typography.Text>
              </Space>
            </Timeline.Item>
          ))}
        </Timeline>
      </Modal>

      {/* Upload Modal */}
      <Modal
        title="上传包"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        onOk={() => {
          message.success('包上传成功');
          setUploadModalVisible(false);
          load();
        }}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="上传说明"
            description="支持的包格式: .tgz (tar.gz 压缩的包目录，包含 manifest.json 和描述符文件)"
            type="info"
            showIcon
          />
          <Upload.Dragger
            name="file"
            multiple={false}
            accept=".tgz"
            beforeUpload={() => false}
            onChange={(info) => {
              if (info.fileList.length > 0) {
                onUpload(info.fileList[0]);
              }
            }}
            style={{ width: '100%' }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">支持 .tgz 格式的函数包</p>
          </Upload.Dragger>
          <Descriptions column={1} bordered>
            <Descriptions.Item label="目标游戏">
              {localStorage.getItem('game_id') || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="目标环境">
              {localStorage.getItem('env') || 'prod'}
            </Descriptions.Item>
          </Descriptions>
        </Space>
      </Modal>

      {/* Canary Configuration Modal */}
      <Modal
        title="灰度发布配置"
        open={canaryModalVisible}
        onCancel={() => setCanaryModalVisible(false)}
        onOk={() => {
          message.success('灰度配置已保存');
          setCanaryModalVisible(false);
          load();
        }}
        width={600}
      >
        {selectedPack && (
          <Form layout="vertical">
            <Form.Item label="包信息">
              <Space>
                <span>{selectedPack.name}</span>
                <Tag color="blue">{selectedPack.version}</Tag>
              </Space>
            </Form.Item>
            <Form.Item label="启用灰度发布" required>
              <Switch />
            </Form.Item>
            <Form.Item label="灰度比例 (%)" required>
              <Row gutter={16}>
                <Col span={12}>
                  <Progress percent={10} />
                </Col>
                <Col span={12}>
                  <InputNumber min={1} max={100} defaultValue={10} onChange={(value) => console.log(value)} />
                </Col>
              </Row>
            </Form.Item>
            <Form.Item label="灰度规则" required>
              <Input.TextArea
                rows={4}
                placeholder='灰度规则配置 (JSON 格式):&#10;{&#10;  "game_id": "prefix:1000",&#10;  "user_id": "mod:10"&#10;}'
              />
            </Form.Item>
            <Form.Item label="灰度时长" required>
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
            <Form.Item label="回滚策略">
              <Select
                defaultValue="auto"
                options={[
                  { label: '自动回滚（错误率超阈值）', value: 'auto' },
                  { label: '手动回滚', value: 'manual' },
                  { label: '不回滚', value: 'none' },
                ]}
              />
            </Form.Item>
            <Alert
              message="灰度发布说明"
              description="灰度发布允许您将新版本先发布给一小部分用户，观察运行情况后再逐步推广到全部用户。"
              type="warning"
              showIcon
            />
          </Form>
        )}
      </Modal>
    </PageContainer>
  );
}
