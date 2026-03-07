import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  List,
  Modal,
  Row,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  BellOutlined,
  HistoryOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  RocketOutlined,
  SafetyOutlined,
  CopyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl, useLocation, useNavigate } from '@umijs/max';
import {
  changeMyPassword,
  getMyGames,
  getMyPermissions,
  getMyProfile,
  updateMyProfile,
  ProfileGame,
  ProfilePermission,
} from '@/services/api/me';
import { listAudit, AuditEvent } from '@/services/api/audit';
import { listMessages, MessageItem } from '@/services/api/messages';
import { listPermissions, type PermissionRecord } from '@/services/api/permissions';
import { createFeedback } from '@/services/api/support';
import './index.less';

const { Title, Text } = Typography;

const TAB_KEYS = {
  PROFILE: 'profile',
  SECURITY: 'security',
  GAMES: 'games',
  PERMISSIONS: 'permissions',
  ACTIVITY: 'activity',
  SESSIONS: 'sessions',
  NOTIFICATIONS: 'notifications',
} as const;

type PermissionApplyItem = {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  category?: string;
};

type PermissionApplyTemplate = Omit<PermissionApplyItem, 'name' | 'description'> & {
  nameId: string;
  descriptionId: string;
};

const FALLBACK_APPLY_PERMISSION_TEMPLATES: PermissionApplyTemplate[] = [
  {
    id: 'workspaces:edit',
    nameId: 'profile.permissions.fallback.workspaces.edit.name',
    descriptionId: 'profile.permissions.fallback.workspaces.edit.description',
    resource: 'workspaces',
    action: 'edit',
    category: 'workspace',
  },
  {
    id: 'workspaces:publish',
    nameId: 'profile.permissions.fallback.workspaces.publish.name',
    descriptionId: 'profile.permissions.fallback.workspaces.publish.description',
    resource: 'workspaces',
    action: 'publish',
    category: 'workspace',
  },
  {
    id: 'workspaces:rollback',
    nameId: 'profile.permissions.fallback.workspaces.rollback.name',
    descriptionId: 'profile.permissions.fallback.workspaces.rollback.description',
    resource: 'workspaces',
    action: 'rollback',
    category: 'workspace',
  },
  {
    id: 'functions:manage',
    nameId: 'profile.permissions.fallback.functions.manage.name',
    descriptionId: 'profile.permissions.fallback.functions.manage.description',
    resource: 'functions',
    action: 'manage',
    category: 'functions',
  },
  {
    id: 'audit:read',
    nameId: 'profile.permissions.fallback.audit.read.name',
    descriptionId: 'profile.permissions.fallback.audit.read.description',
    resource: 'audit',
    action: 'read',
    category: 'audit',
  },
  {
    id: 'ops:manage',
    nameId: 'profile.permissions.fallback.ops.manage.name',
    descriptionId: 'profile.permissions.fallback.ops.manage.description',
    resource: 'ops',
    action: 'manage',
    category: 'ops',
  },
];

function pickAuditMetaValue(meta: Record<string, any> | undefined, keys: string[]): string {
  if (!meta) return '';
  for (const key of keys) {
    const value = meta[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value);
    }
  }
  return '';
}

export default function Profile() {
  const intl = useIntl();
  const location = useLocation();
  const navigate = useNavigate();
  const formatMessage = (id: string) => intl.formatMessage({ id });
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [games, setGames] = useState<ProfileGame[]>([]);
  const [permissions, setPermissions] = useState<ProfilePermission[]>([]);
  const [permissionIds, setPermissionIds] = useState<string[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<PermissionRecord[]>([]);
  const [permissionCatalogAvailable, setPermissionCatalogAvailable] = useState(true);
  const [applyPermissionModalVisible, setApplyPermissionModalVisible] = useState(false);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [selectedApplyPermission, setSelectedApplyPermission] =
    useState<PermissionApplyItem | null>(null);
  const [activities, setActivities] = useState<AuditEvent[]>([]);
  const [loginRecords, setLoginRecords] = useState<AuditEvent[]>([]);
  const [notifications, setNotifications] = useState<MessageItem[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [applyForm] = Form.useForm();
  const [avatarForm] = Form.useForm();
  const infoSectionRef = useRef<HTMLDivElement>(null);
  const initialTab = useMemo(
    () => new URLSearchParams(location.search).get('tab') || TAB_KEYS.PROFILE,
    [location.search],
  );
  const [activeTab, setActiveTab] = useState(initialTab);
  const fallbackApplyPermissions = useMemo<PermissionApplyItem[]>(
    () =>
      FALLBACK_APPLY_PERMISSION_TEMPLATES.map((item) => ({
        id: item.id,
        name: formatMessage(item.nameId),
        description: formatMessage(item.descriptionId),
        resource: item.resource,
        action: item.action,
        category: item.category,
      })),
    [formatMessage],
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const p = await getMyProfile();
      setProfile(p);
      form.setFieldsValue({
        display_name: p.display_name || p.nickname,
        email: p.email,
        phone: p.phone,
      });
      loadExtras(p.username);
    } catch (error) {
      message.error(formatMessage('profile.load.error'));
    }
  };

  const loadExtras = async (username?: string) => {
    setExtrasLoading(true);
    try {
      const [gamesRes, permsRes, auditsRes, loginRes, notificationsRes, permissionCatalogRes] =
        await Promise.allSettled([
          getMyGames(),
          getMyPermissions({}),
          listAudit({ actor: username, size: 8 }),
          username
            ? listAudit({
                actor: username,
                kinds: 'login,auth_login,login_fail,login_rate_limited',
                size: 20,
              })
            : Promise.resolve({ events: [] }),
          listMessages({ status: 'all', size: 8 }),
          listPermissions({ page: 1, pageSize: 500 }),
        ]);

      setGames(gamesRes.status === 'fulfilled' ? gamesRes.value?.games || [] : []);
      if (permsRes.status === 'fulfilled') {
        const payload = permsRes.value || {};
        const ids = payload.permissionIDs || payload.permissionIds || payload.permission_ids || [];
        setPermissions(payload.permissions || []);
        setPermissionIds(Array.isArray(ids) ? ids : []);
      } else {
        setPermissions([]);
        setPermissionIds([]);
      }
      setActivities(auditsRes.status === 'fulfilled' ? auditsRes.value?.events || [] : []);
      setLoginRecords(loginRes.status === 'fulfilled' ? loginRes.value?.events || [] : []);
      setNotifications(
        notificationsRes.status === 'fulfilled' ? notificationsRes.value?.messages || [] : [],
      );
      if (permissionCatalogRes.status === 'fulfilled') {
        setPermissionCatalog(permissionCatalogRes.value?.items || []);
        setPermissionCatalogAvailable(true);
      } else {
        setPermissionCatalog([]);
        setPermissionCatalogAvailable(false);
      }
    } catch (error) {
      message.error(formatMessage('profile.extras.error'));
    } finally {
      setExtrasLoading(false);
    }
  };

  const handleProfileSubmit = async (values: any) => {
    setLoading(true);
    try {
      await updateMyProfile({
        display_name: values.display_name,
        email: values.email,
        phone: values.phone,
      });
      message.success(formatMessage('profile.update.success'));
      loadProfile();
    } catch (error) {
      message.error(formatMessage('profile.update.error'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordFinish = async (values: any) => {
    setPasswordLoading(true);
    try {
      await changeMyPassword({
        current: values.current,
        password: values.password,
      });
      message.success(formatMessage('profile.password.success'));
      setPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      message.error(formatMessage('profile.password.error'));
      throw error;
    } finally {
      setPasswordLoading(false);
    }
  };

  const showPasswordModal = () => {
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  };

  const handleAvatarSubmit = async () => {
    const values = await avatarForm.validateFields();
    try {
      await updateMyProfile({ avatar: values.avatar });
      message.success(formatMessage('profile.avatar.success'));
      setAvatarModalVisible(false);
      loadProfile();
    } catch (error) {
      message.error(formatMessage('profile.update.error'));
    }
  };

  const getStatusBadge = (status?: boolean) => (
    <Badge
      status={status ? 'success' : 'default'}
      text={
        status ? formatMessage('profile.status.active') : formatMessage('profile.status.inactive')
      }
    />
  );

  const stats = [
    { title: formatMessage('profile.stats.games'), value: games.length, icon: <RocketOutlined /> },
    {
      title: formatMessage('profile.stats.roles'),
      value: profile?.roles?.length || 0,
      icon: <UserOutlined />,
    },
    {
      title: formatMessage('profile.stats.permissions'),
      value: permissions.length,
      icon: <SafetyOutlined />,
    },
    {
      title: formatMessage('profile.stats.activities'),
      value: activities.length,
      icon: <HistoryOutlined />,
    },
  ];

  const permissionGroups = useMemo(() => {
    const map = new Map<string, { resource: string; actions: Set<string>; scope?: string }>();
    permissions.forEach((perm) => {
      const gameId = perm.game_id ?? (perm as any)?.gameId;
      const env = perm.env ?? (perm as any)?.env;
      const scope = gameId || env ? `${gameId || ''} ${env || ''}`.trim() : '';
      const key = `${perm.resource}-${scope}`;
      if (!map.has(key)) {
        map.set(key, {
          resource: perm.resource,
          actions: new Set(Array.isArray(perm.actions) ? perm.actions : []),
          scope,
        });
      } else {
        (Array.isArray(perm.actions) ? perm.actions : []).forEach((action) =>
          map.get(key)!.actions.add(action),
        );
      }
    });
    return Array.from(map.values()).map((item) => ({
      resource: item.resource,
      actions: Array.from(item.actions),
      scope: item.scope,
    }));
  }, [permissions]);

  const ownedPermissionKeySet = useMemo(() => {
    const keys = new Set<string>();
    permissions.forEach((perm) => {
      (perm.actions || []).forEach((action) => {
        keys.add(`${perm.resource}:${action}`.toLowerCase());
      });
    });
    permissionIds.forEach((id) => keys.add(String(id).toLowerCase()));
    return keys;
  }, [permissions, permissionIds]);

  const applyPermissionCandidates = useMemo(() => {
    const source: PermissionApplyItem[] =
      permissionCatalog.length > 0
        ? permissionCatalog.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            resource: item.resource,
            action: item.action,
            category: item.category,
          }))
        : fallbackApplyPermissions;

    return source
      .filter((item) => {
        const key = `${item.resource}:${item.action}`.toLowerCase();
        return (
          !ownedPermissionKeySet.has(key) &&
          !ownedPermissionKeySet.has(String(item.id).toLowerCase())
        );
      })
      .slice(0, 20);
  }, [fallbackApplyPermissions, permissionCatalog, ownedPermissionKeySet]);

  const loginSessionRows = useMemo(() => {
    return (loginRecords || []).map((item, idx) => {
      const meta = (item.meta || {}) as Record<string, any>;
      const ip = pickAuditMetaValue(meta, ['ip', 'client_ip', 'remote_ip', 'x_forwarded_for']);
      const region = pickAuditMetaValue(meta, ['ip_region', 'region', 'geo']);
      const userAgent = pickAuditMetaValue(meta, ['user_agent', 'ua', 'agent']);
      const success =
        !String(item.kind || '').includes('fail') &&
        !String(item.kind || '').includes('rate_limited');
      return {
        key: `${item.hash || item.time || idx}`,
        time: item.time,
        kind: item.kind,
        ip,
        region,
        userAgent,
        success,
        target: item.target,
      };
    });
  }, [loginRecords]);

  const latestLoginIP = useMemo(() => {
    const first = loginSessionRows.find((row) => row.ip);
    return first?.ip || 'N/A';
  }, [loginSessionRows]);

  const handleOpenApplyPermission = (item: PermissionApplyItem) => {
    setSelectedApplyPermission(item);
    applyForm.resetFields();
    setApplyPermissionModalVisible(true);
  };

  const buildApplyPermissionContent = (reason: string) => {
    if (!selectedApplyPermission) return '';
    return [
      `${formatMessage('profile.permissions.apply.content.applicant')}: ${
        profile?.username || '-'
      }`,
      `${formatMessage('profile.permissions.apply.content.permission')}: ${
        selectedApplyPermission.name
      }`,
      `${formatMessage('profile.permissions.apply.content.permission.key')}: ${
        selectedApplyPermission.resource
      }:${selectedApplyPermission.action}`,
      `${formatMessage('profile.permissions.apply.content.permission.id')}: ${
        selectedApplyPermission.id
      }`,
      `${formatMessage('profile.permissions.apply.content.reason')}: ${reason || '-'}`,
    ].join('\n');
  };

  const handleCopyPermissionApplyContent = async () => {
    const values = await applyForm.validateFields();
    const content = buildApplyPermissionContent(values.reason);
    await navigator.clipboard.writeText(content);
    message.success(formatMessage('profile.permissions.apply.copy.success'));
  };

  const handleSubmitPermissionApply = async () => {
    const values = await applyForm.validateFields();
    const content = buildApplyPermissionContent(values.reason);
    setApplySubmitting(true);
    try {
      await createFeedback({
        category: 'permission_request',
        content,
        priority: 'normal',
        source: 'profile_permission_apply',
      });
      message.success(formatMessage('profile.permissions.apply.submit.success'));
      setApplyPermissionModalVisible(false);
    } catch (error) {
      // 部分环境可能未开放反馈写入，降级为复制文案+人工提交流程
      await navigator.clipboard.writeText(content);
      message.warning(formatMessage('profile.permissions.apply.submit.fallback'));
    } finally {
      setApplySubmitting(false);
    }
  };

  const infoItems = [
    {
      title: formatMessage('profile.info.user.id'),
      value: profile?.id ?? 'N/A',
      icon: <UserOutlined />,
    },
    {
      title: formatMessage('profile.info.username'),
      value: profile?.username,
      icon: <UserOutlined />,
    },
    {
      title: formatMessage('profile.info.email'),
      value: profile?.email,
      icon: <MailOutlined />,
    },
    {
      title: formatMessage('profile.info.phone'),
      value: profile?.phone || 'N/A',
      icon: <PhoneOutlined />,
    },
    {
      title: formatMessage('profile.info.joined'),
      value: profile?.created_at
        ? new Date(profile.created_at).toLocaleString()
        : profile?.createdAt
        ? new Date(profile.createdAt).toLocaleString()
        : 'N/A',
      icon: <RocketOutlined />,
    },
    {
      title: formatMessage('profile.info.last.login'),
      value: profile?.last_login_at
        ? new Date(profile.last_login_at).toLocaleString()
        : profile?.lastLoginAt
        ? new Date(profile.lastLoginAt).toLocaleString()
        : 'N/A',
      icon: <HistoryOutlined />,
    },
    {
      title: formatMessage('profile.info.last.login.ip'),
      value: latestLoginIP,
      icon: <HistoryOutlined />,
    },
  ];

  const renderGames = () => (
    <Card loading={extrasLoading}>
      <List
        dataSource={games}
        locale={{ emptyText: formatMessage('profile.games.empty') }}
        renderItem={(game) => (
          <List.Item>
            <List.Item.Meta
              title={
                <Space>
                  <Text strong>
                    {game.game_name ||
                      (game as any).gameName ||
                      game.game_id ||
                      (game as any).gameId}
                  </Text>
                  <Tag>{game.game_id || (game as any).gameId}</Tag>
                </Space>
              }
              description={
                <Space direction="vertical" size="small">
                  <div>
                    <Text type="secondary">{formatMessage('profile.games.envs')}</Text>
                    <Space wrap>
                      {(game.envs || []).map((env) => (
                        <Tag key={env} color="geekblue">
                          {env}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                  <div>
                    <Text type="secondary">{formatMessage('profile.games.permissions')}</Text>
                    <Space wrap>
                      {(game.permissions || []).map((perm) => (
                        <Tag key={perm}>{perm}</Tag>
                      ))}
                    </Space>
                  </div>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );

  const renderPermissions = () => (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card loading={extrasLoading} title={formatMessage('profile.permissions.summary.title')}>
        <List
          dataSource={permissionGroups}
          locale={{ emptyText: formatMessage('profile.permissions.empty') }}
          renderItem={(item) => (
            <List.Item>
              <div style={{ width: '100%' }}>
                <Space>
                  <Text strong>{item.resource}</Text>
                  {item.scope && <Tag color="purple">{item.scope}</Tag>}
                </Space>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    {item.actions.map((action) => (
                      <Tag key={action} color="cyan">
                        {action}
                      </Tag>
                    ))}
                  </Space>
                </div>
              </div>
            </List.Item>
          )}
        />
      </Card>
      <Card
        title={formatMessage('profile.permissions.apply.title')}
        extra={
          !permissionCatalogAvailable ? (
            <Tag color="gold">{formatMessage('profile.permissions.apply.catalog.fallback')}</Tag>
          ) : (
            <Tag color="green">{formatMessage('profile.permissions.apply.catalog.live')}</Tag>
          )
        }
      >
        <List
          dataSource={applyPermissionCandidates}
          locale={{ emptyText: formatMessage('profile.permissions.apply.empty') }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button key="apply" type="link" onClick={() => handleOpenApplyPermission(item)}>
                  {formatMessage('profile.permissions.apply.action')}
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{item.name}</Text>
                    <Tag>
                      {item.resource}:{item.action}
                    </Tag>
                    {item.category && <Tag color="blue">{item.category}</Tag>}
                  </Space>
                }
                description={
                  item.description || formatMessage('profile.permissions.apply.no.description')
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );

  const renderAuditList = (data: AuditEvent[], emptyText: string) => (
    <List
      dataSource={data}
      locale={{ emptyText }}
      renderItem={(item) => (
        <List.Item>
          <List.Item.Meta
            title={
              <Space>
                <Tag color="blue">{item.kind}</Tag>
                <Text>{item.target || '-'}</Text>
              </Space>
            }
            description={
              <Space direction="vertical" size={0}>
                <Text type="secondary">
                  {item.time ? new Date(item.time).toLocaleString() : '-'}
                </Text>
                {item.meta && (
                  <Text type="secondary">
                    {Object.entries(item.meta)
                      .slice(0, 2)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(' · ')}
                  </Text>
                )}
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );

  const renderNotifications = () => (
    <Card loading={extrasLoading}>
      <List
        dataSource={notifications}
        locale={{ emptyText: formatMessage('profile.notifications.empty') }}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              title={
                <Space>
                  <Badge status={item.read ? 'default' : 'processing'} />
                  <Text strong>
                    {item.title || formatMessage('profile.notifications.untitled')}
                  </Text>
                </Space>
              }
              description={
                <Space direction="vertical" size={0}>
                  <Text>{item.content}</Text>
                  <Text type="secondary">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                  </Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );

  const renderLoginSessions = () => (
    <Card
      loading={extrasLoading}
      extra={
        <Button type="link" onClick={() => loadExtras(profile?.username)}>
          {formatMessage('profile.activities.refresh')}
        </Button>
      }
    >
      <Table
        rowKey="key"
        size="small"
        pagination={{ pageSize: 8, showSizeChanger: false }}
        dataSource={loginSessionRows}
        locale={{ emptyText: formatMessage('profile.sessions.empty') }}
        columns={[
          {
            title: formatMessage('profile.sessions.col.time'),
            dataIndex: 'time',
            width: 180,
            render: (value: string) => (value ? new Date(value).toLocaleString() : '-'),
          },
          {
            title: formatMessage('profile.sessions.col.result'),
            dataIndex: 'success',
            width: 100,
            render: (success: boolean) =>
              success ? (
                <Tag color="green">{formatMessage('profile.sessions.result.success')}</Tag>
              ) : (
                <Tag color="red">{formatMessage('profile.sessions.result.failed')}</Tag>
              ),
          },
          {
            title: 'IP',
            dataIndex: 'ip',
            width: 160,
            render: (value: string) => value || '-',
          },
          {
            title: formatMessage('profile.sessions.col.region'),
            dataIndex: 'region',
            width: 160,
            render: (value: string) => value || '-',
          },
          {
            title: formatMessage('profile.sessions.col.kind'),
            dataIndex: 'kind',
            width: 140,
            render: (value: string) => <Tag>{value || '-'}</Tag>,
          },
          {
            title: formatMessage('profile.sessions.col.ua'),
            dataIndex: 'userAgent',
            ellipsis: true,
            render: (value: string) => value || '-',
          },
        ]}
      />
      <Divider style={{ margin: '12px 0' }} />
      <Text type="secondary">{formatMessage('profile.sessions.hint')}</Text>
    </Card>
  );

  const passwordModal = (
    <Modal
      open={passwordModalVisible}
      title={formatMessage('profile.password.modal.title')}
      onCancel={() => {
        setPasswordModalVisible(false);
        passwordForm.resetFields();
      }}
      onOk={() => passwordForm.submit()}
      okText={formatMessage('profile.password.modal.submit')}
      confirmLoading={passwordLoading}
    >
      <Alert
        message={formatMessage('profile.password.modal.warning')}
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Form layout="vertical" form={passwordForm} onFinish={handlePasswordFinish}>
        <Form.Item
          name="current"
          label={formatMessage('profile.password.current')}
          rules={[{ required: true }]}
        >
          <Input.Password placeholder={formatMessage('profile.password.current.placeholder')} />
        </Form.Item>
        <Form.Item
          name="password"
          label={formatMessage('profile.password.new')}
          rules={[
            { required: true },
            { min: 6, message: formatMessage('profile.password.min.length') },
          ]}
        >
          <Input.Password placeholder={formatMessage('profile.password.new.placeholder')} />
        </Form.Item>
        <Form.Item
          name="confirm"
          label={formatMessage('profile.password.confirm')}
          rules={[
            { required: true },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(formatMessage('profile.password.mismatch')));
              },
            }),
          ]}
        >
          <Input.Password placeholder={formatMessage('profile.password.confirm.placeholder')} />
        </Form.Item>
      </Form>
    </Modal>
  );

  const avatarModal = (
    <Modal
      open={avatarModalVisible}
      title={formatMessage('profile.avatar.modal.title')}
      onCancel={() => setAvatarModalVisible(false)}
      onOk={() => handleAvatarSubmit().catch(() => {})}
      okText={formatMessage('profile.avatar.modal.submit')}
    >
      <Form form={avatarForm} layout="vertical" initialValues={{ avatar: profile?.avatar }}>
        <Form.Item
          name="avatar"
          label={formatMessage('profile.avatar.modal.label')}
          rules={[
            { required: true, message: formatMessage('profile.avatar.modal.required') },
            { type: 'url', message: formatMessage('profile.avatar.modal.invalid') },
          ]}
        >
          <Input placeholder={formatMessage('profile.avatar.modal.placeholder')} />
        </Form.Item>
      </Form>
    </Modal>
  );

  const permissionApplyModal = (
    <Modal
      open={applyPermissionModalVisible}
      title={formatMessage('profile.permissions.apply.modal.title')}
      onCancel={() => {
        setApplyPermissionModalVisible(false);
        applyForm.resetFields();
      }}
      onOk={() => handleSubmitPermissionApply().catch(() => {})}
      okText={formatMessage('profile.permissions.apply.modal.submit')}
      confirmLoading={applySubmitting}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        {selectedApplyPermission && (
          <Alert
            showIcon
            type="info"
            message={selectedApplyPermission.name}
            description={`${selectedApplyPermission.resource}:${selectedApplyPermission.action}`}
          />
        )}
        <Form form={applyForm} layout="vertical">
          <Form.Item
            name="reason"
            label={formatMessage('profile.permissions.apply.reason')}
            rules={[
              {
                required: true,
                message: formatMessage('profile.permissions.apply.reason.required'),
              },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder={formatMessage('profile.permissions.apply.reason.placeholder')}
            />
          </Form.Item>
        </Form>
        <Space>
          <Button
            icon={<CopyOutlined />}
            onClick={() => handleCopyPermissionApplyContent().catch(() => {})}
          >
            {formatMessage('profile.permissions.apply.copy')}
          </Button>
          <Button
            onClick={() => {
              navigate('/support/feedback');
            }}
          >
            {formatMessage('profile.permissions.apply.goto.feedback')}
          </Button>
        </Space>
      </Space>
    </Modal>
  );

  if (!profile) {
    return (
      <>
        <PageContainer>
          <Card>
            <Space size="large" direction="vertical" align="center" style={{ width: '100%' }}>
              <Avatar size={96} icon={<UserOutlined />} />
              <Title level={4}>{formatMessage('profile.loading')}</Title>
            </Space>
          </Card>
        </PageContainer>
        {passwordModal}
      </>
    );
  }

  return (
    <>
      <PageContainer className="profile-page">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card className="profile-hero" styles={{ body: { padding: 24 } }}>
            <Row gutter={[32, 24]} align="middle">
              <Col xs={24} md={10}>
                <Space align="center">
                  <Avatar
                    size={96}
                    src={profile?.avatar}
                    icon={!profile?.avatar ? <UserOutlined /> : undefined}
                    style={{
                      border: '3px solid #1890ff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  />
                  <div>
                    <Space align="center">
                      <Title level={3} style={{ margin: 0 }}>
                        {profile?.display_name || profile?.username}
                      </Title>
                      {getStatusBadge(profile?.active)}
                    </Space>
                    <Space wrap style={{ marginTop: 8 }}>
                      {(profile?.roles || []).map((role: string) => (
                        <Tag color="blue" key={role}>
                          {role}
                        </Tag>
                      ))}
                    </Space>
                    <Descriptions column={1} size="small" style={{ marginTop: 12 }}>
                      <Descriptions.Item label={formatMessage('profile.info.username')}>
                        <Text strong>{profile?.username}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label={formatMessage('profile.info.email')}>
                        {profile?.email || 'N/A'}
                      </Descriptions.Item>
                      <Descriptions.Item label={formatMessage('profile.info.phone')}>
                        {profile?.phone || 'N/A'}
                      </Descriptions.Item>
                      <Descriptions.Item label={formatMessage('profile.info.joined')}>
                        {profile?.created_at
                          ? new Date(profile.created_at).toLocaleString()
                          : profile?.createdAt
                          ? new Date(profile.createdAt).toLocaleString()
                          : 'N/A'}
                      </Descriptions.Item>
                      <Descriptions.Item label={formatMessage('profile.info.last.login')}>
                        {profile?.last_login_at
                          ? new Date(profile.last_login_at).toLocaleString()
                          : profile?.lastLoginAt
                          ? new Date(profile.lastLoginAt).toLocaleString()
                          : 'N/A'}
                      </Descriptions.Item>
                    </Descriptions>
                    <Space style={{ marginTop: 12 }}>
                      <Button
                        type="primary"
                        onClick={() =>
                          infoSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
                        }
                      >
                        {formatMessage('profile.hero.edit')}
                      </Button>
                      <Button onClick={showPasswordModal}>
                        {formatMessage('profile.password.change.btn')}
                      </Button>
                      <Button
                        onClick={() => {
                          avatarForm.setFieldsValue({ avatar: profile?.avatar || '' });
                          setAvatarModalVisible(true);
                        }}
                      >
                        {formatMessage('profile.avatar.change')}
                      </Button>
                    </Space>
                  </div>
                </Space>
              </Col>
              <Col xs={24} md={14}>
                <Row gutter={[16, 16]} className="profile-stats">
                  {stats.map((stat) => (
                    <Col xs={12} md={6} key={stat.title}>
                      <Card bordered={false} className="profile-stats__card">
                        <Statistic title={stat.title} value={stat.value} prefix={stat.icon} />
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Col>
            </Row>
          </Card>

          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key);
              const search = new URLSearchParams(location.search);
              search.set('tab', key);
              navigate(`${location.pathname}?${search.toString()}`, { replace: true });
            }}
            items={[
              {
                key: TAB_KEYS.PROFILE,
                label: (
                  <Space>
                    <UserOutlined />
                    {formatMessage('profile.tab.info')}
                  </Space>
                ),
                children: (
                  <Row gutter={[24, 24]} ref={infoSectionRef}>
                    <Col xs={24} lg={16}>
                      <Card title={formatMessage('profile.section.profileForm')}>
                        <Form form={form} layout="vertical" onFinish={handleProfileSubmit}>
                          <Form.Item
                            name="display_name"
                            label={formatMessage('profile.info.display.name')}
                            rules={[
                              {
                                required: true,
                                message: formatMessage('profile.display.name.required'),
                              },
                              {
                                max: 50,
                                message: formatMessage('profile.display.name.max.length'),
                              },
                            ]}
                          >
                            <Input
                              placeholder={formatMessage('profile.display.name.placeholder')}
                            />
                          </Form.Item>

                          <Form.Item
                            name="email"
                            label={formatMessage('profile.info.email')}
                            rules={[
                              { type: 'email', message: formatMessage('profile.email.invalid') },
                            ]}
                          >
                            <Input placeholder={formatMessage('profile.email.placeholder')} />
                          </Form.Item>

                          <Form.Item
                            name="phone"
                            label={formatMessage('profile.info.phone')}
                            rules={[
                              { max: 20, message: formatMessage('profile.phone.max.length') },
                              {
                                pattern: /^1[3-9]\d{9}$/,
                                message: formatMessage('profile.phone.invalid'),
                              },
                            ]}
                          >
                            <Input placeholder={formatMessage('profile.phone.placeholder')} />
                          </Form.Item>

                          <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading}>
                              {formatMessage('profile.save')}
                            </Button>
                          </Form.Item>
                        </Form>
                      </Card>
                    </Col>
                    <Col xs={24} lg={8}>
                      <Card title={formatMessage('profile.account.info')}>
                        <Descriptions column={1} size="small">
                          {infoItems.map((item) => (
                            <Descriptions.Item key={item.title} label={item.title}>
                              <Space>
                                {item.icon}
                                <span>{item.value || 'N/A'}</span>
                              </Space>
                            </Descriptions.Item>
                          ))}
                        </Descriptions>
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: TAB_KEYS.SECURITY,
                label: (
                  <Space>
                    <SafetyOutlined />
                    {formatMessage('profile.security.center')}
                  </Space>
                ),
                children: (
                  <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                      <Card
                        title={formatMessage('profile.security.center')}
                        extra={
                          <Button type="link" icon={<LockOutlined />} onClick={showPasswordModal}>
                            {formatMessage('profile.password.change.btn')}
                          </Button>
                        }
                      >
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                          <div className="security-item">
                            <Space>
                              <SafetyOutlined />
                              <div>
                                <Text strong>
                                  {formatMessage('profile.security.settings.title')}
                                </Text>
                                <br />
                                <Text type="secondary">
                                  {formatMessage('profile.security.description')}
                                </Text>
                              </div>
                            </Space>
                            <Badge status="processing" text={formatMessage('profile.enabled')} />
                          </div>
                          <div className="security-item">
                            <Space>
                              <PhoneOutlined />
                              <div>
                                <Text strong>{formatMessage('profile.login.notification')}</Text>
                                <br />
                                <Text type="secondary">
                                  {formatMessage('profile.security.phone.helper')}
                                </Text>
                              </div>
                            </Space>
                          </div>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: TAB_KEYS.GAMES,
                label: (
                  <Space>
                    <RocketOutlined />
                    {formatMessage('profile.games.title')}
                  </Space>
                ),
                children: renderGames(),
              },
              {
                key: TAB_KEYS.PERMISSIONS,
                label: (
                  <Space>
                    <SafetyOutlined />
                    {formatMessage('profile.permissions.summary.title')}
                  </Space>
                ),
                children: renderPermissions(),
              },
              {
                key: TAB_KEYS.ACTIVITY,
                label: (
                  <Space>
                    <HistoryOutlined />
                    {formatMessage('profile.activities.title')}
                  </Space>
                ),
                children: (
                  <Card
                    loading={extrasLoading}
                    extra={
                      <Button type="link" onClick={() => loadExtras(profile?.username)}>
                        {formatMessage('profile.activities.refresh')}
                      </Button>
                    }
                  >
                    {renderAuditList(activities, formatMessage('profile.activities.empty'))}
                  </Card>
                ),
              },
              {
                key: TAB_KEYS.SESSIONS,
                label: (
                  <Space>
                    <HistoryOutlined />
                    {formatMessage('profile.sessions.title')}
                  </Space>
                ),
                children: renderLoginSessions(),
              },
              {
                key: TAB_KEYS.NOTIFICATIONS,
                label: (
                  <Space>
                    <BellOutlined />
                    {formatMessage('profile.notifications.title')}
                  </Space>
                ),
                children: renderNotifications(),
              },
            ]}
          />
        </Space>
      </PageContainer>
      {passwordModal}
      {avatarModal}
      {permissionApplyModal}
    </>
  );
}
