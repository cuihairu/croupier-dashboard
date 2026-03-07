import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Button, message, Spin, Tooltip } from 'antd';
import {
  MenuUnfoldOutlined,
  AppstoreOutlined,
  EyeOutlined,
  SaveOutlined,
  FileOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import { useParams } from '@umijs/max';
import type { WorkspaceConfig } from '@/types/workspace';
import { loadWorkspaceConfig, saveWorkspaceConfig } from '@/services/workspaceConfig';
import { listDescriptors } from '@/services/api/functions';
import FunctionList from './components/FunctionList';
import LayoutDesigner from './components/LayoutDesigner';
import ConfigPreview from './components/ConfigPreview';
import TemplateManager, { type Template } from './components/TemplateManager';
import { useSimpleHistory } from './hooks/useHistory';

/** 两种模式：2=函数+设计器（默认），3=函数+设计器+预览 */
type ViewMode = 2 | 3;

export default function WorkspaceEditor() {
  const params = useParams<{ objectKey: string }>();
  const objectKey = params.objectKey || '';

  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [availableFunctions, setAvailableFunctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(2);
  const [collapsed, setCollapsed] = useState(false);

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
    setSaving(true);
    try {
      await saveWorkspaceConfig(config);
      message.success('保存成功');
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 模板选择处理
  const handleTemplateSelect = useCallback(
    (template: Template) => {
      if (!config) return;

      const newConfig: WorkspaceConfig = {
        ...config,
        ...template.config,
        objectKey: config.objectKey, // 保持原始 objectKey
      };

      handleConfigChange(newConfig, `应用模板: ${template.name}`);
      setTemplateModalVisible(false);
      message.success(`已应用模板: ${template.name}`);
    },
    [config, handleConfigChange],
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
    </PageContainer>
  );
}
