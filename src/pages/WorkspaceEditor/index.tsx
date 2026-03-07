import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Button, message, Spin, Tooltip, Modal, Drawer, List, Tag, Space } from 'antd';
import {
  MenuUnfoldOutlined,
  AppstoreOutlined,
  EyeOutlined,
  SaveOutlined,
  FileOutlined,
  UndoOutlined,
  RedoOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useAccess, useParams } from '@umijs/max';
import type { WorkspaceConfig, WorkspaceVersionRecord } from '@/types/workspace';
import {
  loadWorkspaceConfig,
  listWorkspaceVersions,
  rollbackWorkspaceVersion,
  saveWorkspaceConfig,
  validateWorkspaceConfig,
} from '@/services/workspaceConfig';
import { trackWorkspaceEvent } from '@/services/workspace/telemetry';
import { listDescriptors } from '@/services/api/functions';
import FunctionList from './components/FunctionList';
import LayoutDesigner from './components/LayoutDesigner';
import ConfigPreview from './components/ConfigPreview';
import TemplateManager, { type Template } from './components/TemplateManager';
import { useSimpleHistory } from './hooks/useHistory';

/** 两种模式：2=函数+设计器（默认），3=函数+设计器+预览 */
type ViewMode = 2 | 3;
const V1_TAB_LAYOUT_TYPES = new Set(['form-detail', 'list', 'form', 'detail']);

function resolveWorkspaceStatus(config?: WorkspaceConfig | null): string {
  if (!config) return 'unknown';
  if (config.status) return config.status;
  return config.published ? 'published' : 'draft';
}

function summarizeVersion(version: WorkspaceVersionRecord): string {
  const cfg = version.config;
  const status = resolveWorkspaceStatus(cfg);
  const tabs = cfg?.layout?.type === 'tabs' ? cfg.layout.tabs?.length || 0 : 0;
  const topLayout = cfg?.layout?.type || '-';
  return [`状态: ${status}`, `顶层布局: ${topLayout}`, `标签页: ${tabs}`].join(' · ');
}

function summarizeDiff(
  currentConfig: WorkspaceConfig | null,
  targetVersion: WorkspaceVersionRecord,
): string {
  const currentStatus = resolveWorkspaceStatus(currentConfig);
  const targetStatus = resolveWorkspaceStatus(targetVersion.config);
  const currentLayout = currentConfig?.layout?.type || '-';
  const targetLayout = targetVersion.config?.layout?.type || '-';
  const currentTabs =
    currentConfig?.layout?.type === 'tabs' ? currentConfig.layout.tabs?.length || 0 : 0;
  const targetTabs =
    targetVersion.config?.layout?.type === 'tabs'
      ? targetVersion.config.layout.tabs?.length || 0
      : 0;

  const changed: string[] = [];
  if (currentStatus !== targetStatus) changed.push(`状态 ${currentStatus} -> ${targetStatus}`);
  if (currentLayout !== targetLayout) changed.push(`布局 ${currentLayout} -> ${targetLayout}`);
  if (currentTabs !== targetTabs) changed.push(`标签页 ${currentTabs} -> ${targetTabs}`);

  return changed.length > 0 ? changed.join(' · ') : '与当前草稿结构一致';
}

export default function WorkspaceEditor() {
  const access = useAccess() as any;
  const params = useParams<{ objectKey: string }>();
  const objectKey = params.objectKey || '';

  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [availableFunctions, setAvailableFunctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(2);
  const [collapsed, setCollapsed] = useState(false);
  const [versionsVisible, setVersionsVisible] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [rollingVersionId, setRollingVersionId] = useState('');
  const [versions, setVersions] = useState<WorkspaceVersionRecord[]>([]);

  // 模板管理
  const [templateModalVisible, setTemplateModalVisible] = useState(false);

  // 使用历史记录 Hook
  const history = useSimpleHistory<WorkspaceConfig | null>(null, 100);

  useEffect(() => {
    loadData();
  }, [objectKey]);

  const loadData = async () => {
    if (!objectKey) {
      message.error('缺少对象标识');
      return;
    }
    setLoading(true);
    try {
      const workspaceConfig = await loadWorkspaceConfig(objectKey);
      trackWorkspaceEvent('workspace_load', { objectKey });
      const initialConfig = workspaceConfig || {
        objectKey,
        title: `${objectKey} 管理`,
        layout: { type: 'tabs', tabs: [] },
      };
      setConfig(initialConfig);
      history.reset(initialConfig);

      const descriptors = await listDescriptors();
      const functions = descriptors.filter(
        (d) => !d.entity || d.entity === objectKey || d.id.startsWith(`${objectKey}.`),
      );
      setAvailableFunctions(functions.length > 0 ? functions : descriptors);
    } catch (error: any) {
      trackWorkspaceEvent('workspace_load_error', {
        objectKey,
        error: error?.message || String(error),
      });
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理配置变更（带历史记录）
  const handleConfigChange = useCallback(
    (newConfig: WorkspaceConfig, description: string = '更新配置') => {
      setConfig(newConfig);
      history.setState(newConfig, description);
    },
    [history],
  );

  // 撤销
  const handleUndo = useCallback(() => {
    history.undo();
    setConfig(history.state);
  }, [history]);

  // 重做
  const handleRedo = useCallback(() => {
    history.redo();
    setConfig(history.state);
  }, [history]);

  // 保存
  const handleSave = async () => {
    if (!config) return;
    if (!access?.canWorkspaceEdit) {
      message.error('无编辑权限');
      return;
    }
    const validation = validateWorkspaceConfig(config);
    if (!validation.valid) {
      Modal.error({
        title: '配置校验失败',
        content: (
          <div>
            {(validation.errors || []).slice(0, 8).map((error, index) => (
              <div key={`${index}-${error}`}>{`${index + 1}. ${error}`}</div>
            ))}
          </div>
        ),
      });
      return;
    }
    setSaving(true);
    try {
      await saveWorkspaceConfig(config);
      trackWorkspaceEvent('workspace_save', {
        objectKey: config.objectKey,
        tabs: config.layout?.type === 'tabs' ? config.layout.tabs?.length || 0 : 0,
      });
      message.success('保存成功');
    } catch (error: any) {
      trackWorkspaceEvent('workspace_save_error', {
        objectKey: config.objectKey,
        error: error?.message || String(error),
      });
      message.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 模板选择处理
  const handleTemplateSelect = useCallback(
    (template: Template) => {
      if (!config) return;

      const layout = (template.config as any)?.layout;
      if (
        layout?.type !== 'tabs' ||
        (Array.isArray(layout?.tabs) &&
          layout.tabs.some((tab: any) => !V1_TAB_LAYOUT_TYPES.has(tab?.layout?.type)))
      ) {
        trackWorkspaceEvent('workspace_template_apply_error', {
          objectKey: config.objectKey,
          template: template.name,
          reason: 'unsupported_layout',
        });
        message.error('当前仅支持 tabs + form-detail/list/form/detail 模板');
        return;
      }

      const newConfig: WorkspaceConfig = {
        ...config,
        ...template.config,
        objectKey: config.objectKey, // 保持原始 objectKey
      };

      handleConfigChange(newConfig, `应用模板: ${template.name}`);
      setTemplateModalVisible(false);
      trackWorkspaceEvent('workspace_template_apply', {
        objectKey: config.objectKey,
        template: template.name,
      });
      message.success(`已应用模板: ${template.name}`);
    },
    [config, handleConfigChange],
  );

  const loadVersions = useCallback(async () => {
    if (!objectKey) return;
    setVersionsLoading(true);
    try {
      const rows = await listWorkspaceVersions(objectKey);
      trackWorkspaceEvent('workspace_versions_load', {
        objectKey,
        count: Array.isArray(rows) ? rows.length : 0,
      });
      setVersions(Array.isArray(rows) ? rows : []);
    } catch (error: any) {
      trackWorkspaceEvent('workspace_versions_load_error', {
        objectKey,
        error: error?.message || String(error),
      });
      message.warning(error?.message || '版本接口暂不可用');
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }, [objectKey]);

  const handleRollback = useCallback(
    (version: WorkspaceVersionRecord) => {
      if (!objectKey) return;
      if (!access?.canWorkspaceRollback) {
        message.error('无回滚权限');
        return;
      }
      Modal.confirm({
        title: '确认回滚',
        content: (
          <div>
            <div>{`目标版本: v${version.version}`}</div>
            <div>{`版本摘要: ${summarizeVersion(version)}`}</div>
            <div>{`当前版本: ${
              typeof config?.version === 'number' ? `v${config.version}` : '-'
            }`}</div>
            <div>{`差异摘要: ${summarizeDiff(config, version)}`}</div>
            <div style={{ marginTop: 8, color: '#cf1322' }}>
              此操作会覆盖当前草稿，请确认后执行。
            </div>
          </div>
        ),
        onOk: async () => {
          try {
            setRollingVersionId(version.id);
            await rollbackWorkspaceVersion(objectKey, version.id);
            await loadData();
            await loadVersions();
            trackWorkspaceEvent('workspace_rollback', {
              objectKey,
              versionId: version.id,
              version: version.version,
            });
            message.success(`已回滚到版本 v${version.version}`);
          } catch (error: any) {
            trackWorkspaceEvent('workspace_rollback_error', {
              objectKey,
              versionId: version.id,
              error: error?.message || String(error),
            });
            message.error(error?.message || '回滚失败');
          } finally {
            setRollingVersionId('');
          }
        },
      });
    },
    [objectKey, loadVersions, access?.canWorkspaceRollback, config?.version],
  );

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S: 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl/Cmd + Z: 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Y 或 Ctrl/Cmd + Shift + Z: 重做
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleUndo, handleRedo, viewMode]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  const functionWidth = collapsed ? 40 : 260;
  const previewWidth = viewMode === 3 ? 320 : 0;
  const gap = viewMode === 3 ? 16 : 8;
  const designerWidth = `calc(100% - ${functionWidth}px - ${previewWidth}px - ${gap}px)`;

  return (
    <PageContainer
      title={`编排 Workspace: ${objectKey}`}
      extra={[
        // 撤销/重做按钮
        <Button.Group key="history">
          <Tooltip title="撤销 (Ctrl+Z)">
            <Button icon={<UndoOutlined />} disabled={!history.canUndo} onClick={handleUndo} />
          </Tooltip>
          <Tooltip title="重做 (Ctrl+Y)">
            <Button icon={<RedoOutlined />} disabled={!history.canRedo} onClick={handleRedo} />
          </Tooltip>
        </Button.Group>,
        // 模板按钮
        <Button
          key="template"
          icon={<FileOutlined />}
          onClick={() => setTemplateModalVisible(true)}
          style={{ marginLeft: 8 }}
        >
          模板
        </Button>,
        <Button
          key="versions"
          icon={<HistoryOutlined />}
          onClick={() => {
            setVersionsVisible(true);
            loadVersions().catch(() => {});
          }}
          style={{ marginLeft: 8 }}
          disabled={!access?.canWorkspaceRead}
        >
          版本
        </Button>,
        // 视图模式切换
        <div
          key="view-mode"
          style={{
            display: 'inline-flex',
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            overflow: 'hidden',
            marginLeft: 8,
          }}
        >
          <Tooltip title="函数 + 设计器">
            <Button
              type={viewMode === 2 ? 'primary' : 'text'}
              icon={<AppstoreOutlined />}
              size="small"
              style={{ borderRadius: 0, border: 'none' }}
              onClick={() => setViewMode(2)}
            />
          </Tooltip>
          <Tooltip title="函数 + 设计器 + 预览">
            <Button
              type={viewMode === 3 ? 'primary' : 'text'}
              icon={<EyeOutlined />}
              size="small"
              style={{ borderRadius: 0, border: 'none', borderLeft: '1px solid #d9d9d9' }}
              onClick={() => setViewMode(3)}
            />
          </Tooltip>
        </div>,
        // 保存按钮
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
          style={{ marginLeft: 8 }}
          disabled={!access?.canWorkspaceEdit}
        >
          保存
        </Button>,
      ]}
    >
      <div style={{ display: 'flex', gap: 8, height: 'calc(100vh - 180px)', overflow: 'hidden' }}>
        <div
          style={{
            width: functionWidth,
            flexShrink: 0,
            transition: 'width 0.2s',
            overflow: 'hidden',
          }}
        >
          {collapsed ? (
            <div
              style={{
                width: 40,
                height: '100%',
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: 12,
                backgroundColor: '#fafafa',
                cursor: 'pointer',
              }}
              onClick={() => setCollapsed(false)}
            >
              <Tooltip title="展开函数面板" placement="right">
                <MenuUnfoldOutlined style={{ color: '#666' }} />
              </Tooltip>
              <div
                style={{
                  marginTop: 16,
                  writingMode: 'vertical-rl',
                  fontSize: 12,
                  color: '#999',
                  letterSpacing: 2,
                }}
              >
                可用函数
              </div>
            </div>
          ) : (
            <div style={{ height: '100%' }}>
              <FunctionList functions={availableFunctions} onCollapse={() => setCollapsed(true)} />
            </div>
          )}
        </div>

        <div style={{ width: designerWidth, flexShrink: 0, overflow: 'auto' }}>
          <LayoutDesigner
            config={config}
            onChange={(newConfig) => handleConfigChange(newConfig, '更新布局')}
            descriptors={availableFunctions}
          />
        </div>

        {/* 预览面板 */}
        {viewMode === 3 && (
          <div style={{ width: previewWidth, flexShrink: 0, overflow: 'auto' }}>
            <ConfigPreview config={config} />
          </div>
        )}
      </div>

      {/* 模板管理弹窗 */}
      <TemplateManager
        visible={templateModalVisible}
        onClose={() => setTemplateModalVisible(false)}
        onSelect={handleTemplateSelect}
        currentConfig={config as Record<string, any>}
      />

      <Drawer
        title="版本历史"
        open={versionsVisible}
        onClose={() => setVersionsVisible(false)}
        width={520}
        extra={
          <Button
            size="small"
            onClick={() => loadVersions().catch(() => {})}
            loading={versionsLoading}
          >
            刷新
          </Button>
        }
      >
        <List
          loading={versionsLoading}
          dataSource={versions}
          locale={{ emptyText: '暂无版本记录或接口未启用' }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key="rollback"
                  size="small"
                  danger
                  disabled={!access?.canWorkspaceRollback}
                  loading={rollingVersionId === item.id}
                  onClick={() => handleRollback(item)}
                >
                  回滚
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space size={8}>
                    <span>{`v${item.version}`}</span>
                    <Tag color="blue">{item.id}</Tag>
                  </Space>
                }
                description={[
                  item.createdAt ? `时间: ${new Date(item.createdAt).toLocaleString('zh-CN')}` : '',
                  item.createdBy ? `操作人: ${item.createdBy}` : '',
                  item.comment ? `备注: ${item.comment}` : '',
                  summarizeVersion(item),
                  `差异: ${summarizeDiff(config, item)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            </List.Item>
          )}
        />
      </Drawer>
    </PageContainer>
  );
}
