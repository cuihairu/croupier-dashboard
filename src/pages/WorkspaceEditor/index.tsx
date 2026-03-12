import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  message,
  Spin,
  Tooltip,
  Modal,
  Drawer,
  List,
  Tag,
  Space,
  Descriptions,
  Select,
  Input,
  Collapse,
} from 'antd';
import {
  MenuUnfoldOutlined,
  AppstoreOutlined,
  EyeOutlined,
  SaveOutlined,
  FileOutlined,
  DownloadOutlined,
  UploadOutlined,
  UndoOutlined,
  RedoOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  BorderOutlined,
  PlayCircleOutlined,
  TeamOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useAccess, useParams } from '@umijs/max';
import type { WorkspaceConfig, WorkspaceVersionRecord } from '@/types/workspace';
import {
  getWorkspaceVersionDetail,
  exportWorkspaceBackupBundle,
  exportPublishedWorkspaceConfig,
  exportWorkspaceMetadata,
  exportWorkspaceConfig,
  importWorkspaceConfig,
  loadWorkspaceConfig,
  listWorkspaceVersions,
  rollbackWorkspaceVersion,
  saveWorkspaceConfig,
  validateWorkspaceConfig,
} from '@/services/workspaceConfig';
import { validateTabConfig, formatValidationResult } from './utils/configValidator';
import { analyzeMultipleTabsPerformance } from './utils/configAnalyzer';
import { trackWorkspaceEvent } from '@/services/workspace/telemetry';
import { getWorkspaceErrorMessage } from '@/services/workspace/errors';
import { listDescriptors } from '@/services/api/functions';
import FunctionList from './components/FunctionList';
import LayoutDesigner from './components/LayoutDesigner';
import ConfigPreview from './components/ConfigPreview';
import TemplateManager, { type Template } from './components/TemplateManager';
import DiffViewer from './components/DiffViewer';
import PerformancePanel from './components/PerformancePanel';
import LayoutThumbnail, { MultiTabThumbnail } from './components/LayoutThumbnail';
import GuideTour, { shouldShowGuide, QuickGuideButton } from './components/GuideTour';
import ConfigTestTool from './components/ConfigTestTool';
import AuditLogPanel, { AuditLogDetailModal } from './components/AuditLogPanel';
import CollaborationPanel, { CollaborationIndicator } from './components/CollaborationPanel';
import CanvasEditor, { CanvasModeButton } from './components/CanvasEditor/CanvasEditor';
import DraftPanel, { DraftIndicator } from './components/DraftPanel';
import { analyzeConfigImpact } from './utils/impactAnalyzer';
import { getCollaborationManager } from './utils/collaborationManager';
import { AutoSaveDraft, saveDraft } from './utils/draftManager';
import { useSimpleHistory } from './hooks/useHistory';

/** 两种模式：2=函数+设计器（默认），3=函数+设计器+预览 */
type ViewMode = 2 | 3;
const V1_TAB_LAYOUT_TYPES = new Set([
  'form-detail',
  'list',
  'form',
  'detail',
  'kanban',
  'timeline',
  'split',
  'wizard',
  'dashboard',
  'grid',
  'custom',
]);
type VersionTimeRange = 'all' | '7d' | '30d' | '90d';

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

function buildVersionDiff(
  currentConfig: WorkspaceConfig | null,
  targetConfig?: WorkspaceConfig | null,
): {
  fieldChanges: string[];
  layoutChanges: string[];
  tabChanges: string[];
} {
  if (!currentConfig || !targetConfig) {
    return {
      fieldChanges: ['缺少可对比的配置快照'],
      layoutChanges: [],
      tabChanges: [],
    };
  }

  const fieldChanges: string[] = [];
  const layoutChanges: string[] = [];
  const tabChanges: string[] = [];

  const currentStatus = resolveWorkspaceStatus(currentConfig);
  const targetStatus = resolveWorkspaceStatus(targetConfig);
  if (currentStatus !== targetStatus) {
    fieldChanges.push(`状态: ${currentStatus} -> ${targetStatus}`);
  }
  if ((currentConfig.title || '') !== (targetConfig.title || '')) {
    fieldChanges.push(`标题: ${currentConfig.title || '-'} -> ${targetConfig.title || '-'}`);
  }
  if ((currentConfig.description || '') !== (targetConfig.description || '')) {
    fieldChanges.push('描述: 已变更');
  }
  if (Boolean(currentConfig.published) !== Boolean(targetConfig.published)) {
    fieldChanges.push(
      `发布标记: ${Boolean(currentConfig.published)} -> ${Boolean(targetConfig.published)}`,
    );
  }

  const currentLayout = currentConfig.layout?.type || '-';
  const targetLayout = targetConfig.layout?.type || '-';
  if (currentLayout !== targetLayout) {
    layoutChanges.push(`顶层布局: ${currentLayout} -> ${targetLayout}`);
  }

  const currentTabs = currentConfig.layout?.type === 'tabs' ? currentConfig.layout.tabs || [] : [];
  const targetTabs = targetConfig.layout?.type === 'tabs' ? targetConfig.layout.tabs || [] : [];
  const currentMap = new Map(currentTabs.map((tab) => [tab.key, tab]));
  const targetMap = new Map(targetTabs.map((tab) => [tab.key, tab]));

  targetTabs.forEach((tab) => {
    if (!currentMap.has(tab.key)) {
      tabChanges.push(`新增 Tab: ${tab.key}`);
    }
  });
  currentTabs.forEach((tab) => {
    if (!targetMap.has(tab.key)) {
      tabChanges.push(`删除 Tab: ${tab.key}`);
    }
  });
  targetTabs.forEach((tab) => {
    const currentTab = currentMap.get(tab.key);
    if (!currentTab) return;
    if ((currentTab.title || '') !== (tab.title || '')) {
      tabChanges.push(`Tab ${tab.key} 标题变更`);
    }
    if (currentTab.layout?.type !== tab.layout?.type) {
      tabChanges.push(`Tab ${tab.key} 布局: ${currentTab.layout?.type} -> ${tab.layout?.type}`);
    }
    const currentFns = new Set(currentTab.functions || []);
    const targetFns = new Set(tab.functions || []);
    const addedFns = Array.from(targetFns).filter((fn) => !currentFns.has(fn));
    const removedFns = Array.from(currentFns).filter((fn) => !targetFns.has(fn));
    if (addedFns.length > 0) {
      tabChanges.push(`Tab ${tab.key} 新增函数: ${addedFns.join(', ')}`);
    }
    if (removedFns.length > 0) {
      tabChanges.push(`Tab ${tab.key} 删除函数: ${removedFns.join(', ')}`);
    }
  });

  if (fieldChanges.length === 0) fieldChanges.push('字段未变化');
  if (layoutChanges.length === 0) layoutChanges.push('布局未变化');
  if (tabChanges.length === 0) tabChanges.push('Tab 结构未变化');

  return { fieldChanges, layoutChanges, tabChanges };
}

function getVersionTimeWindow(range: VersionTimeRange): { from?: string; to?: string } | undefined {
  if (range === 'all') return undefined;
  const now = Date.now();
  const durationMap: Record<Exclude<VersionTimeRange, 'all'>, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
  };
  const days = durationMap[range as Exclude<VersionTimeRange, 'all'>];
  return {
    from: new Date(now - days * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date(now).toISOString(),
  };
}

function filterVersionsByTime(
  versions: WorkspaceVersionRecord[],
  range: VersionTimeRange,
): WorkspaceVersionRecord[] {
  if (range === 'all') return versions;
  const window = getVersionTimeWindow(range);
  if (!window?.from) return versions;
  const fromTs = new Date(window.from).getTime();
  return versions.filter((item) => {
    if (!item.createdAt) return true;
    return new Date(item.createdAt).getTime() >= fromTs;
  });
}

function collectRequiredFunctions(candidate: WorkspaceConfig): string[] {
  if (candidate.layout?.type !== 'tabs' || !Array.isArray(candidate.layout.tabs)) return [];
  const result = new Set<string>();
  candidate.layout.tabs.forEach((tab) => {
    tab.functions?.forEach((fn) => fn && result.add(fn));
    const layout = tab.layout as any;
    if (layout?.listFunction) result.add(layout.listFunction);
    if (layout?.queryFunction) result.add(layout.queryFunction);
    if (layout?.submitFunction) result.add(layout.submitFunction);
    if (layout?.detailFunction) result.add(layout.detailFunction);
    if (layout?.dataFunction) result.add(layout.dataFunction);

    const tryCollectComp = (comp: any) => {
      if (!comp?.config) return;
      if (comp.config.listFunction) result.add(comp.config.listFunction);
      if (comp.config.queryFunction) result.add(comp.config.queryFunction);
      if (comp.config.submitFunction) result.add(comp.config.submitFunction);
      if (comp.config.detailFunction) result.add(comp.config.detailFunction);
      if (comp.config.dataFunction) result.add(comp.config.dataFunction);
    };
    if (Array.isArray(layout?.panels)) {
      layout.panels.forEach((p: any) => tryCollectComp(p?.component));
    }
    if (Array.isArray(layout?.steps)) {
      layout.steps.forEach((s: any) => tryCollectComp(s?.component));
    }
    if (Array.isArray(layout?.items)) {
      layout.items.forEach((it: any) => tryCollectComp(it?.component));
    }
  });
  return Array.from(result);
}

function autoBindTemplateFunctions(
  candidate: WorkspaceConfig,
  availableFunctionIds: string[],
): WorkspaceConfig {
  if (candidate.layout?.type !== 'tabs' || !Array.isArray(candidate.layout.tabs)) return candidate;
  if (!Array.isArray(availableFunctionIds) || availableFunctionIds.length === 0) return candidate;

  const pickFn = (preferred: string[] = []) => {
    for (const id of preferred) {
      if (id && availableFunctionIds.includes(id)) return id;
    }
    return availableFunctionIds[0];
  };

  const bindIntoConfig = (cfg: any, preferred: string[]) => {
    if (!cfg) return cfg;
    const next = { ...cfg };
    const t = String(next?.type || '');
    const isAvailable = (id?: string) => !!id && availableFunctionIds.includes(id);

    if ((t === 'list' || 'listFunction' in next) && !isAvailable(next.listFunction)) {
      next.listFunction = pickFn(preferred);
    }
    if (t === 'list' && (!Array.isArray(next.columns) || next.columns.length === 0)) {
      next.columns = [
        { key: 'id', title: 'ID' },
        { key: 'name', title: '名称' },
        { key: 'status', title: '状态' },
      ];
    }

    if ((t === 'form-detail' || 'queryFunction' in next) && !isAvailable(next.queryFunction)) {
      next.queryFunction = pickFn(preferred);
    }
    if (t === 'form-detail' && !Array.isArray(next.queryFields)) {
      next.queryFields = [];
    }

    if ((t === 'form' || 'submitFunction' in next) && !isAvailable(next.submitFunction)) {
      next.submitFunction = pickFn(preferred);
    }
    if (t === 'form' && (!Array.isArray(next.fields) || next.fields.length === 0)) {
      next.fields = [{ key: 'name', label: '名称', type: 'input', required: true }];
    }

    if ((t === 'detail' || 'detailFunction' in next) && !isAvailable(next.detailFunction)) {
      next.detailFunction = pickFn(preferred);
    }
    if (t === 'detail' && (!Array.isArray(next.sections) || next.sections.length === 0)) {
      next.sections = [
        {
          title: '基础信息',
          fields: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: '名称' },
          ],
        },
      ];
    }

    if (
      (t === 'kanban' || t === 'timeline' || 'dataFunction' in next) &&
      !isAvailable(next.dataFunction)
    ) {
      next.dataFunction = pickFn(preferred);
    }
    return next;
  };

  const nextTabs = candidate.layout.tabs.map((tab: any) => {
    const preferred =
      Array.isArray(tab?.functions) && tab.functions.length > 0 ? tab.functions : [];
    const fallback = pickFn(preferred);
    const nextTab = { ...tab };
    if (!Array.isArray(nextTab.functions) || nextTab.functions.length === 0) {
      nextTab.functions = [fallback];
    }
    const layout = nextTab.layout as any;
    if (!layout) return nextTab;
    let nextLayout = bindIntoConfig(layout, nextTab.functions);

    if (Array.isArray(layout.panels)) {
      nextLayout = {
        ...nextLayout,
        panels: layout.panels.map((p: any) => ({
          ...p,
          component: p?.component
            ? { ...p.component, config: bindIntoConfig(p.component.config, nextTab.functions) }
            : p?.component,
        })),
      };
    }
    if (Array.isArray(layout.steps)) {
      nextLayout = {
        ...nextLayout,
        steps: layout.steps.map((s: any) => ({
          ...s,
          component: s?.component
            ? { ...s.component, config: bindIntoConfig(s.component.config, nextTab.functions) }
            : s?.component,
        })),
      };
    }
    if (Array.isArray(layout.items)) {
      nextLayout = {
        ...nextLayout,
        items: layout.items.map((it: any) => ({
          ...it,
          component: it?.component
            ? { ...it.component, config: bindIntoConfig(it.component.config, nextTab.functions) }
            : it?.component,
        })),
      };
    }

    nextTab.layout = nextLayout;
    return nextTab;
  });

  return {
    ...candidate,
    layout: {
      ...candidate.layout,
      tabs: nextTabs,
    },
  };
}

function isTemplateNonBlockingValidationError(error: string): boolean {
  return /(listFunction|submitFunction|detailFunction|queryFunction|dataFunction) 不能为空/.test(
    error,
  );
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
  const [selectedVersion, setSelectedVersion] = useState<WorkspaceVersionRecord | null>(null);
  const [compareVersions, setCompareVersions] = useState<{
    old: WorkspaceVersionRecord;
    new: WorkspaceVersionRecord;
  } | null>(null);
  const [versionDetailLoading, setVersionDetailLoading] = useState(false);
  const [versionDetailId, setVersionDetailId] = useState('');
  const [versionTimeRange, setVersionTimeRange] = useState<VersionTimeRange>('all');
  const [importVisible, setImportVisible] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importContent, setImportContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 模板管理
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [performanceModalVisible, setPerformanceModalVisible] = useState(false);
  const [thumbnailModalVisible, setThumbnailModalVisible] = useState(false);
  const [configTestVisible, setConfigTestVisible] = useState(false);
  const [auditLogVisible, setAuditLogVisible] = useState(false);

  // 新手引导
  const [guideTourVisible, setGuideTourVisible] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  // 协作面板
  const [collaborationVisible, setCollaborationVisible] = useState(false);

  // 画布编辑器
  const [canvasEditorVisible, setCanvasEditorVisible] = useState(false);
  const [canvasEditorTab, setCanvasEditorTab] = useState<any>(null);

  // 草稿管理
  const [draftVisible, setDraftVisible] = useState(false);
  const autoSaveRef = useRef<AutoSaveDraft | null>(null);

  // 使用历史记录 Hook
  const history = useSimpleHistory<WorkspaceConfig | null>(null, 100);

  useEffect(() => {
    trackWorkspaceEvent('workspace_page_open', {
      page: 'workspace_editor',
      objectKey,
    });
    loadData();
  }, [objectKey]);

  // 新手引导自动启动检测
  useEffect(() => {
    // 延迟检测，确保页面已完全加载
    const timer = setTimeout(() => {
      if (shouldShowGuide()) {
        setGuideTourVisible(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // 组件卸载时清理协作管理器
  useEffect(() => {
    return () => {
      const manager = getCollaborationManager();
      manager.leave();
    };
  }, []);

  // 自动保存草稿
  useEffect(() => {
    if (!config || !objectKey) return;

    // 初始化自动保存
    if (!autoSaveRef.current) {
      autoSaveRef.current = new AutoSaveDraft(objectKey, () => config, {
        delay: 30000, // 30秒
        onSave: (draft) => {
          console.log('自动保存草稿:', draft.id);
        },
      });
    }

    // 配置变化时触发自动保存
    autoSaveRef.current.trigger();

    return () => {
      autoSaveRef.current?.dispose();
      autoSaveRef.current = null;
    };
  }, [config, objectKey]);

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
      message.error(getWorkspaceErrorMessage(error, '加载失败'));
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

    // Tab 级别详细校验
    if (config.layout?.type === 'tabs' && config.layout.tabs) {
      const functionIds = descriptors.map((d) => d.id);
      const tabErrors: string[] = [];
      const tabWarnings: string[] = [];

      config.layout.tabs.forEach((tab) => {
        const result = validateTabConfig(tab, functionIds);
        if (!result.valid) {
          tabErrors.push(`Tab [${tab.key}]:`);
          result.errors.forEach((error) => {
            tabErrors.push(`  - ${error.path}: ${error.message}`);
          });
        }
        if (result.warnings.length > 0) {
          tabWarnings.push(`Tab [${tab.key}]:`);
          result.warnings.forEach((warning) => {
            tabWarnings.push(`  - ${warning.path}: ${warning.message}`);
          });
        }
      });

      if (tabErrors.length > 0) {
        Modal.error({
          title: 'Tab 配置校验失败',
          width: 600,
          content: (
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {tabErrors.slice(0, 20).map((error, index) => (
                <div key={index} style={{ fontSize: 12, fontFamily: 'monospace' }}>
                  {error}
                </div>
              ))}
            </div>
          ),
        });
        return;
      }

      if (tabWarnings.length > 0) {
        Modal.confirm({
          title: 'Tab 配置警告',
          width: 600,
          content: (
            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              <div>以下配置可能存在问题，建议检查：</div>
              {tabWarnings.slice(0, 10).map((warning, index) => (
                <div key={index} style={{ fontSize: 12, fontFamily: 'monospace', marginTop: 4 }}>
                  {warning}
                </div>
              ))}
            </div>
          ),
          okText: '继续保存',
          cancelText: '取消',
          onOk: () => {
            doSave();
          },
        });
        return;
      }
    }

    doSave();
  };

  const doSave = async () => {
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
      message.error(getWorkspaceErrorMessage(error, '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = useCallback(async () => {
    if (!objectKey) return;
    if (!access?.canWorkspaceRead) {
      message.error('无导出权限');
      return;
    }
    try {
      const content = await exportWorkspaceConfig(objectKey);
      const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${objectKey}.workspace.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('配置已导出');
    } catch (error: any) {
      message.error(getWorkspaceErrorMessage(error, '导出失败'));
    }
  }, [objectKey, access?.canWorkspaceRead]);

  const handleExportPublished = useCallback(async () => {
    if (!objectKey) return;
    if (!access?.canWorkspaceRead) {
      message.error('无导出权限');
      return;
    }
    try {
      const content = await exportPublishedWorkspaceConfig(objectKey);
      const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${objectKey}.workspace.published.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('已发布配置已导出');
    } catch (error: any) {
      message.error(getWorkspaceErrorMessage(error, '导出已发布版本失败'));
    }
  }, [objectKey, access?.canWorkspaceRead]);

  const handleExportMetadata = useCallback(async () => {
    if (!objectKey) return;
    if (!access?.canWorkspaceRead) {
      message.error('无导出权限');
      return;
    }
    try {
      const content = await exportWorkspaceMetadata(objectKey);
      const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${objectKey}.workspace.metadata.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('元信息已导出');
    } catch (error: any) {
      message.error(getWorkspaceErrorMessage(error, '导出元信息失败'));
    }
  }, [objectKey, access?.canWorkspaceRead]);

  const handleExportBackupBundle = useCallback(async () => {
    if (!objectKey) return;
    if (!access?.canWorkspaceRead) {
      message.error('无导出权限');
      return;
    }
    try {
      const content = await exportWorkspaceBackupBundle(objectKey);
      const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${objectKey}.workspace.backup.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      trackWorkspaceEvent('workspace_backup_export', { objectKey });
      message.success('备份包已导出');
    } catch (error: any) {
      trackWorkspaceEvent('workspace_backup_export_error', {
        objectKey,
        error: error?.message || String(error),
      });
      message.error(getWorkspaceErrorMessage(error, '导出备份包失败'));
    }
  }, [objectKey, access?.canWorkspaceRead]);

  const applyImportedConfig = useCallback(
    async (content: string) => {
      if (!objectKey) return;
      setImporting(true);
      try {
        const saved = await importWorkspaceConfig(content, {
          targetObjectKey: objectKey,
          forceDraft: true,
        });
        setConfig(saved);
        history.reset(saved);
        trackWorkspaceEvent('workspace_import', {
          objectKey,
          importedObjectKey: saved.objectKey,
        });
        setImportVisible(false);
        setImportContent('');
        message.success('导入成功，已保存为当前对象草稿');
      } catch (error: any) {
        trackWorkspaceEvent('workspace_import_error', {
          objectKey,
          error: error?.message || String(error),
        });
        message.error(getWorkspaceErrorMessage(error, '导入失败'));
      } finally {
        setImporting(false);
      }
    },
    [objectKey, history],
  );

  const handleImport = useCallback(async () => {
    if (!objectKey) return;
    if (!access?.canWorkspaceEdit) {
      message.error('无导入权限');
      return;
    }
    const content = importContent.trim();
    if (!content) {
      message.error('请先粘贴或选择配置 JSON');
      return;
    }
    try {
      const parsed = JSON.parse(content) as WorkspaceConfig;
      const normalizedConfig: WorkspaceConfig = {
        ...parsed,
        objectKey,
        status: 'draft',
        published: false,
        publishedAt: undefined,
        publishedBy: undefined,
      };
      const validation = validateWorkspaceConfig(normalizedConfig);
      if (!validation.valid) {
        Modal.error({
          title: '导入前校验失败',
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

      const sourceKey = parsed.objectKey || '';
      if (sourceKey && sourceKey !== objectKey) {
        Modal.confirm({
          title: '检测到对象冲突',
          content: `导入文件 objectKey 为 ${sourceKey}，当前页面对象为 ${objectKey}。将按当前对象覆盖保存为草稿，是否继续？`,
          onOk: async () => {
            await applyImportedConfig(content);
          },
        });
        return;
      }

      await applyImportedConfig(content);
    } catch (error) {
      message.error('导入内容不是合法 JSON');
    }
  }, [objectKey, importContent, access?.canWorkspaceEdit, applyImportedConfig]);

  const handleSelectImportFile = useCallback(() => {
    if (!access?.canWorkspaceEdit) {
      message.error('无导入权限');
      return;
    }
    fileInputRef.current?.click();
  }, [access?.canWorkspaceEdit]);

  const handleImportFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setImportContent(text);
      message.success(`已读取文件: ${file.name}`);
    } catch {
      message.error('读取文件失败');
    } finally {
      event.target.value = '';
    }
  }, []);

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
        message.error(
          '当前仅支持 tabs + form-detail/list/form/detail/kanban/timeline/split/wizard/dashboard/grid/custom 模板',
        );
        return;
      }

      const draftConfig: WorkspaceConfig = {
        ...config,
        ...template.config,
        objectKey: config.objectKey, // 保持原始 objectKey
      };
      const allAvailableIds = (availableFunctions || [])
        .map((fn: any) => String(fn?.id || ''))
        .filter(Boolean);
      const newConfig = autoBindTemplateFunctions(draftConfig, allAvailableIds);

      const availableFunctionIds = new Set(
        (availableFunctions || []).map((fn: any) => String(fn?.id || '')).filter(Boolean),
      );
      const requiredFunctions = collectRequiredFunctions(newConfig);
      const missingFunctions = requiredFunctions.filter((id) => !availableFunctionIds.has(id));
      if (missingFunctions.length > 0) {
        trackWorkspaceEvent('workspace_template_apply_error', {
          objectKey: config.objectKey,
          template: template.name,
          reason: 'missing_functions',
          missingCount: missingFunctions.length,
        });
        Modal.warning({
          title: '模板预检查未通过',
          content: `以下函数未找到: ${missingFunctions.slice(0, 8).join(', ')}`,
        });
        return;
      }

      const validation = validateWorkspaceConfig(newConfig);
      if (!validation.valid) {
        const blockingErrors = (validation.errors || []).filter(
          (error) => !isTemplateNonBlockingValidationError(error),
        );
        const onlyMissingFunctionBindings = blockingErrors.length === 0;
        if (onlyMissingFunctionBindings) {
          handleConfigChange(newConfig, `应用模板: ${template.name}`);
          setTemplateModalVisible(false);
          trackWorkspaceEvent('workspace_template_apply', {
            objectKey: config.objectKey,
            template: template.name,
            degraded: true,
          });
          message.warning('模板已应用，部分函数待绑定后再保存');
          return;
        }
        trackWorkspaceEvent('workspace_template_apply_error', {
          objectKey: config.objectKey,
          template: template.name,
          reason: 'config_validation_failed',
        });
        Modal.warning({
          title: '模板预检查未通过',
          content: `配置不兼容: ${blockingErrors.slice(0, 6).join('；')}`,
        });
        return;
      }

      handleConfigChange(newConfig, `应用模板: ${template.name}`);
      setTemplateModalVisible(false);
      trackWorkspaceEvent('workspace_template_apply', {
        objectKey: config.objectKey,
        template: template.name,
      });
      message.success(`已应用模板: ${template.name}`);
    },
    [config, availableFunctions, handleConfigChange],
  );

  const loadVersions = useCallback(async () => {
    if (!objectKey) return;
    setVersionsLoading(true);
    try {
      const timeWindow = getVersionTimeWindow(versionTimeRange);
      const rows = await listWorkspaceVersions(objectKey, timeWindow);
      const normalizedRows = Array.isArray(rows) ? rows : [];
      const visibleRows = filterVersionsByTime(normalizedRows, versionTimeRange);
      trackWorkspaceEvent('workspace_versions_load', {
        objectKey,
        count: visibleRows.length,
        range: versionTimeRange,
      });
      setVersions(visibleRows);
    } catch (error: any) {
      trackWorkspaceEvent('workspace_versions_load_error', {
        objectKey,
        error: error?.message || String(error),
        range: versionTimeRange,
      });
      message.warning(getWorkspaceErrorMessage(error, '版本接口暂不可用'));
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }, [objectKey, versionTimeRange]);

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
            <div style={{ marginTop: 4, color: '#cf1322' }}>
              回滚后若重新发布，控制台展示行为可能随目标版本发生变化。
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
            message.error(getWorkspaceErrorMessage(error, '回滚失败'));
          } finally {
            setRollingVersionId('');
          }
        },
      });
    },
    [objectKey, loadVersions, access?.canWorkspaceRollback, config?.version],
  );

  const handleOpenVersionDetail = useCallback(
    async (version: WorkspaceVersionRecord) => {
      if (!objectKey) return;
      if (!access?.canWorkspaceRead) {
        message.error('无查看版本权限');
        return;
      }
      setVersionDetailId(version.id);
      setVersionDetailLoading(true);
      try {
        const detail = await getWorkspaceVersionDetail(objectKey, version.id);
        setSelectedVersion(detail || version);
      } catch (error: any) {
        // 兼容后端未启用详情接口的场景：降级使用列表中的快照
        message.warning(getWorkspaceErrorMessage(error, '版本详情接口暂不可用，已展示列表快照'));
        setSelectedVersion(version);
      } finally {
        setVersionDetailLoading(false);
        setVersionDetailId('');
      }
    },
    [objectKey, access?.canWorkspaceRead],
  );

  useEffect(() => {
    if (!versionsVisible) return;
    loadVersions().catch(() => {});
  }, [versionsVisible, versionTimeRange, loadVersions]);

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
  const previewWidth = viewMode === 3 ? 520 : 0;
  const gap = viewMode === 3 ? 16 : 8;
  const designerWidth = `calc(100% - ${functionWidth}px - ${previewWidth}px - ${gap}px)`;

  return (
    <PageContainer
      title={`Workspace 配置: ${objectKey}`}
      extra={[
        // 撤销/重做按钮
        <Space.Compact key="history">
          <Tooltip title="撤销 (Ctrl+Z)">
            <Button icon={<UndoOutlined />} disabled={!history.canUndo} onClick={handleUndo} />
          </Tooltip>
          <Tooltip title="重做 (Ctrl+Y)">
            <Button icon={<RedoOutlined />} disabled={!history.canRedo} onClick={handleRedo} />
          </Tooltip>
        </Space.Compact>,
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
          key="import"
          icon={<UploadOutlined />}
          onClick={() => setImportVisible(true)}
          style={{ marginLeft: 8 }}
          disabled={!access?.canWorkspaceEdit}
        >
          导入
        </Button>,
        <Button
          key="export"
          icon={<DownloadOutlined />}
          onClick={handleExport}
          style={{ marginLeft: 8 }}
          disabled={!access?.canWorkspaceRead}
        >
          导出
        </Button>,
        <Button
          key="export-published"
          icon={<DownloadOutlined />}
          onClick={handleExportPublished}
          style={{ marginLeft: 8 }}
          disabled={!access?.canWorkspaceRead}
        >
          导出已发布
        </Button>,
        <Button
          key="export-metadata"
          icon={<DownloadOutlined />}
          onClick={handleExportMetadata}
          style={{ marginLeft: 8 }}
          disabled={!access?.canWorkspaceRead}
        >
          导出元信息
        </Button>,
        <Button
          key="export-backup"
          icon={<DownloadOutlined />}
          onClick={handleExportBackupBundle}
          style={{ marginLeft: 8 }}
          disabled={!access?.canWorkspaceRead}
        >
          导出备份包
        </Button>,
        <Button
          key="versions"
          icon={<HistoryOutlined />}
          onClick={() => setVersionsVisible(true)}
          style={{ marginLeft: 8 }}
          disabled={!access?.canWorkspaceRead}
        >
          版本
        </Button>,
        <Button
          key="performance"
          icon={<ThunderboltOutlined />}
          onClick={() => setPerformanceModalVisible(true)}
          style={{ marginLeft: 8 }}
        >
          性能
        </Button>,
        <Button
          key="thumbnail"
          icon={<BorderOutlined />}
          onClick={() => setThumbnailModalVisible(true)}
          style={{ marginLeft: 8 }}
        >
          缩略图
        </Button>,
        <Button
          key="config-test"
          icon={<PlayCircleOutlined />}
          onClick={() => setConfigTestVisible(true)}
          style={{ marginLeft: 8 }}
        >
          测试
        </Button>,
        <Button
          key="audit-log"
          icon={<FileOutlined />}
          onClick={() => setAuditLogVisible(true)}
          style={{ marginLeft: 8 }}
        >
          日志
        </Button>,
        <Tooltip key="collaboration" title="协作状态">
          <Button
            icon={<TeamOutlined />}
            onClick={() => setCollaborationVisible(true)}
            style={{ marginLeft: 8 }}
          >
            协作
          </Button>
        </Tooltip>,
        <CanvasModeButton
          key="canvas-editor"
          tabConfig={canvasEditorTab}
          onSave={(newTabConfig) => {
            // 更新当前 Tab 的配置
            if (config && config.layout?.tabs) {
              const updatedTabs = config.layout.tabs.map((tab: any) =>
                tab.key === canvasEditorTab?.key ? { ...tab, layout: newTabConfig.layout } : tab,
              );
              handleConfigChange(
                { ...config, layout: { ...config.layout, tabs: updatedTabs } },
                '画布编辑器保存',
              );
              message.success('画布配置已保存');
            }
          }}
        />,
        <DraftIndicator key="draft" objectKey={objectKey} />,
        <Tooltip key="draft-panel" title="草稿管理">
          <Button
            icon={<FileOutlined />}
            onClick={() => setDraftVisible(true)}
            style={{ marginLeft: 8 }}
          >
            草稿
          </Button>
        </Tooltip>,
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

      <Modal
        title="导入配置 JSON"
        open={importVisible}
        onCancel={() => setImportVisible(false)}
        onOk={() => handleImport().catch(() => {})}
        confirmLoading={importing}
        okText="校验并导入"
        cancelText="取消"
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <div style={{ color: '#666' }}>导入后将强制保存为当前对象草稿，不会直接发布。</div>
          <Space size={8}>
            <Button onClick={handleSelectImportFile} disabled={!access?.canWorkspaceEdit}>
              选择 JSON 文件
            </Button>
            <div style={{ color: '#999', fontSize: 12 }}>支持 .json 文件或粘贴 JSON 内容</div>
          </Space>
          <Input.TextArea
            value={importContent}
            onChange={(e) => setImportContent(e.target.value)}
            placeholder="请粘贴 Workspace 配置 JSON"
            autoSize={{ minRows: 10, maxRows: 18 }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportFileChange}
          />
        </Space>
      </Modal>

      <Drawer
        title="版本历史"
        open={versionsVisible}
        onClose={() => setVersionsVisible(false)}
        width={520}
        extra={
          <Space size={8}>
            <Select<VersionTimeRange>
              size="small"
              style={{ width: 120 }}
              value={versionTimeRange}
              onChange={(value) => setVersionTimeRange(value)}
              options={[
                { label: '全部时间', value: 'all' },
                { label: '最近 7 天', value: '7d' },
                { label: '最近 30 天', value: '30d' },
                { label: '最近 90 天', value: '90d' },
              ]}
            />
            <Button
              size="small"
              onClick={() => loadVersions().catch(() => {})}
              loading={versionsLoading}
            >
              刷新
            </Button>
          </Space>
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
                  key="compare"
                  size="small"
                  onClick={() =>
                    setCompareVersions({
                      old: item,
                      new: {
                        id: 'current',
                        version: 'current',
                        objectKey: config.objectKey,
                        config,
                      } as any,
                    })
                  }
                >
                  对比当前
                </Button>,
                <Button
                  key="detail"
                  size="small"
                  onClick={() => handleOpenVersionDetail(item)}
                  loading={versionDetailLoading && versionDetailId === item.id}
                  disabled={!access?.canWorkspaceRead}
                >
                  详情
                </Button>,
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
                    {item.isCurrentDraft && <Tag color="gold">当前草稿</Tag>}
                    {item.isCurrentPublished && <Tag color="green">当前发布</Tag>}
                  </Space>
                }
                description={[
                  item.createdAt ? `时间: ${new Date(item.createdAt).toLocaleString('zh-CN')}` : '',
                  item.createdBy ? `操作人: ${item.createdBy}` : '',
                  item.comment ? `备注: ${item.comment}` : '',
                  summarizeVersion(item),
                  `差异: ${summarizeDiff(config, item)}`,
                  (() => {
                    const diff = buildVersionDiff(config, item.config);
                    const total =
                      diff.fieldChanges.filter((line) => line !== '字段未变化').length +
                      diff.layoutChanges.filter((line) => line !== '布局未变化').length +
                      diff.tabChanges.filter((line) => line !== 'Tab 结构未变化').length;
                    return `Diff 项数: ${total}`;
                  })(),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            </List.Item>
          )}
        />
      </Drawer>

      <Modal
        title={selectedVersion ? `版本详情 v${selectedVersion.version}` : '版本详情'}
        open={Boolean(selectedVersion)}
        width={860}
        footer={null}
        onCancel={() => setSelectedVersion(null)}
      >
        {selectedVersion && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label="版本 ID">{selectedVersion.id}</Descriptions.Item>
              <Descriptions.Item label="对象">{selectedVersion.objectKey}</Descriptions.Item>
              <Descriptions.Item label="时间">
                {selectedVersion.createdAt
                  ? new Date(selectedVersion.createdAt).toLocaleString('zh-CN')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="操作人">
                {selectedVersion.createdBy || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {resolveWorkspaceStatus(selectedVersion.config)}
              </Descriptions.Item>
              <Descriptions.Item label="标签页">
                {selectedVersion.config?.layout?.type === 'tabs'
                  ? selectedVersion.config.layout.tabs?.length || 0
                  : 0}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>配置 JSON</div>
              <pre
                style={{
                  margin: 0,
                  maxHeight: 420,
                  overflow: 'auto',
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                {JSON.stringify(selectedVersion.config, null, 2)}
              </pre>
            </div>
            <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>与当前草稿 Diff</div>
              <div
                style={{
                  maxHeight: 320,
                  overflow: 'auto',
                  border: '1px solid #f0f0f0',
                  borderRadius: 6,
                  padding: 8,
                  background: '#fafafa',
                }}
              >
                <DiffViewer
                  title={null}
                  oldData={selectedVersion.config}
                  newData={config}
                  expanded={false}
                />
              </div>
            </div>
          </Space>
        )}
      </Modal>

      <Modal
        title={
          compareVersions ? `版本对比: v${compareVersions.old.version} → 当前草稿` : '版本对比'
        }
        open={Boolean(compareVersions)}
        width={900}
        footer={<Button onClick={() => setCompareVersions(null)}>关闭</Button>}
        onCancel={() => setCompareVersions(null)}
      >
        {compareVersions && (
          <DiffViewer
            title={`v${compareVersions.old.version} vs 当前草稿`}
            oldData={compareVersions.old.config}
            newData={compareVersions.new.config}
            expanded={true}
          />
        )}
      </Modal>

      <Modal
        title="配置性能分析"
        open={performanceModalVisible}
        onCancel={() => setPerformanceModalVisible(false)}
        footer={<Button onClick={() => setPerformanceModalVisible(false)}>关闭</Button>}
        width={700}
      >
        {config?.layout?.type === 'tabs' && config.layout.tabs && (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <PerformancePanel
              title="总体性能"
              result={analyzeMultipleTabsPerformance(config.layout.tabs).overall}
            />
            <Collapse
              ghost
              size="small"
              items={config.layout.tabs.map((tab) => ({
                key: tab.key,
                label: `Tab: ${tab.title} (${tab.key})`,
                children: (
                  <PerformancePanel
                    title={null}
                    result={analyzeMultipleTabsPerformance(config.layout.tabs).byTab[tab.key]}
                  />
                ),
              }))}
            />
          </Space>
        )}
      </Modal>

      <Modal
        title="布局结构缩略图"
        open={thumbnailModalVisible}
        onCancel={() => setThumbnailModalVisible(false)}
        footer={<Button onClick={() => setThumbnailModalVisible(false)}>关闭</Button>}
        width={600}
      >
        {config?.layout?.type === 'tabs' && config.layout.tabs ? (
          <MultiTabThumbnail
            tabs={config.layout.tabs}
            onTabClick={(tabKey) => {
              setThumbnailModalVisible(false);
              // 可以添加滚动到对应 Tab 的逻辑
            }}
          />
        ) : config?.layout ? (
          <LayoutThumbnail
            tab={
              {
                key: config.objectKey,
                title: config.title,
                functions: [],
                layout: config.layout,
              } as any
            }
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>暂无配置</div>
        )}
      </Modal>

      {/* 配置测试工具 */}
      {config?.layout?.type === 'tabs' && config.layout.tabs && config.layout.tabs.length > 0 && (
        <ConfigTestTool
          visible={configTestVisible}
          onClose={() => setConfigTestVisible(false)}
          tab={config.layout.tabs[0]}
          descriptors={availableFunctions}
        />
      )}

      {/* 审计日志 */}
      <AuditLogPanel
        visible={auditLogVisible}
        onClose={() => setAuditLogVisible(false)}
        objectKey={objectKey}
      />

      {/* 协作面板 */}
      <Drawer
        title="协作状态"
        placement="right"
        width={380}
        open={collaborationVisible}
        onClose={() => setCollaborationVisible(false)}
        styles={{
          body: { padding: 12 },
        }}
      >
        <CollaborationPanel objectKey={objectKey} isAdmin={access?.canWorkspaceAdmin || false} />
      </Drawer>

      {/* 画布编辑器 */}
      {canvasEditorTab && (
        <CanvasEditor
          visible={canvasEditorVisible}
          tabConfig={canvasEditorTab}
          onSave={(newTabConfig) => {
            if (config && config.layout?.tabs) {
              const updatedTabs = config.layout.tabs.map((tab: any) =>
                tab.key === canvasEditorTab?.key ? { ...tab, layout: newTabConfig.layout } : tab,
              );
              handleConfigChange(
                { ...config, layout: { ...config.layout, tabs: updatedTabs } },
                '画布编辑器保存',
              );
              message.success('画布配置已保存');
              setCanvasEditorVisible(false);
            }
          }}
          onCancel={() => setCanvasEditorVisible(false)}
        />
      )}

      {/* 草稿面板 */}
      <Drawer
        title="草稿管理"
        placement="right"
        width={400}
        open={draftVisible}
        onClose={() => setDraftVisible(false)}
        styles={{
          body: { padding: 12 },
        }}
      >
        <DraftPanel
          objectKey={objectKey}
          onRestore={(restoredConfig) => {
            handleConfigChange(restoredConfig, '恢复草稿');
            setDraftVisible(false);
            message.success('已恢复草稿');
          }}
        />
      </Drawer>

      {/* 新手引导 */}
      <QuickGuideButton
        onStart={() => {
          setGuideTourVisible(true);
          setGuideStep(0);
        }}
      />
      <GuideTour
        visible={guideTourVisible}
        currentStep={guideStep}
        onStepChange={setGuideStep}
        onClose={() => setGuideTourVisible(false)}
      />
    </PageContainer>
  );
}
