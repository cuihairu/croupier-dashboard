/**
 * 画布编辑器
 *
 * 可视化拖拽式布局编辑器，支持画布模式和表单模式切换。
 *
 * @module pages/WorkspaceEditor/components/CanvasEditor/CanvasEditor
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button, Space, Switch, Modal, message, Tooltip, Segmented } from 'antd';
import {
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  ClearOutlined,
  EyeOutlined,
  EditOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import CanvasRenderer from './CanvasRenderer';
import ComponentLibrary from './ComponentLibrary';
import PropertyPanel from './PropertyPanel';
import { useCanvasStore, CanvasProvider } from '../../utils/canvasStore';
import './CanvasEditor.less';

export type EditorMode = 'design' | 'preview';
export type ViewMode = 'canvas' | 'form';

export interface CanvasEditorProps {
  /** 初始 Tab 配置 */
  tabConfig?: any;
  /** 保存回调 */
  onSave?: (config: any) => void;
  /** 取消回调 */
  onCancel?: () => void;
  /** 是否显示 */
  visible?: boolean;
  /** 是否只读 */
  readOnly?: boolean;
}

/**
 * 画布编辑器主组件
 */
export default function CanvasEditor({
  tabConfig,
  onSave,
  onCancel,
  visible = true,
  readOnly = false,
}: CanvasEditorProps) {
  const {
    rootComponent,
    selectedId,
    draggingComponent,
    history,
    historyIndex,
    setRootComponent,
    fromTabConfig,
    toTabConfig,
    addComponent,
    selectComponent,
    undo,
    redo,
    clearCanvas,
  } = useCanvasStore();

  const [editorMode, setEditorMode] = useState<EditorMode>('design');
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');
  const [fullscreen, setFullscreen] = useState(false);

  // 初始化：从 Tab 配置转换
  useEffect(() => {
    if (tabConfig && visible) {
      const canvasComponent = fromTabConfig(tabConfig);
      setRootComponent(canvasComponent);
    }
  }, [tabConfig, visible, fromTabConfig, setRootComponent]);

  // 处理拖拽放置
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      if (!draggingComponent) return;

      // 添加到根组件
      addComponent(null, draggingComponent);
    },
    [draggingComponent, addComponent],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // 保存
  const handleSave = useCallback(() => {
    const config = toTabConfig();
    if (config && onSave) {
      onSave(config);
      message.success('保存成功');
    } else {
      message.warning('没有可保存的配置');
    }
  }, [toTabConfig, onSave]);

  // 取消
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
    clearCanvas();
  }, [onCancel, clearCanvas]);

  // 清空画布
  const handleClear = useCallback(() => {
    Modal.confirm({
      title: '确认清空画布？',
      content: '此操作将清空所有组件，且无法撤销',
      onOk: clearCanvas,
    });
  }, [clearCanvas]);

  // 切换视图模式
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  // 切换编辑器模式
  const handleEditorModeChange = useCallback(
    (mode: EditorMode) => {
      setEditorMode(mode);
      if (mode === 'preview') {
        selectComponent(null);
      }
    },
    [selectComponent],
  );

  // 复制组件
  const handleCopyComponent = useCallback(() => {
    if (selectedId && rootComponent) {
      message.info('复制功能开发中');
    }
  }, [selectedId, rootComponent]);

  // 删除组件
  const handleDeleteComponent = useCallback(() => {
    if (selectedId) {
      // Store 中的 removeComponent 会处理
      message.success('已删除组件');
    }
  }, [selectedId]);

  // 计算是否可以撤销/重做
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  if (!visible) return null;

  const content = (
    <div className={`canvas-editor ${fullscreen ? 'fullscreen' : ''}`}>
      {/* 工具栏 */}
      <div className="canvas-toolbar">
        <Space className="toolbar-left">
          <Segmented
            value={viewMode}
            onChange={(v) => handleViewModeChange(v as ViewMode)}
            options={[
              { label: '画布模式', value: 'canvas', icon: <EditOutlined /> },
              { label: '表单模式', value: 'form', icon: <SaveOutlined /> },
            ]}
          />
        </Space>

        <Space className="toolbar-center">
          <Tooltip title="撤销">
            <Button
              type="text"
              size="small"
              icon={<UndoOutlined />}
              disabled={!canUndo || readOnly}
              onClick={undo}
            />
          </Tooltip>
          <Tooltip title="重做">
            <Button
              type="text"
              size="small"
              icon={<RedoOutlined />}
              disabled={!canRedo || readOnly}
              onClick={redo}
            />
          </Tooltip>
        </Space>

        <Space className="toolbar-right">
          <Switch
            checkedChildren={<EyeOutlined />}
            unCheckedChildren={<EditOutlined />}
            checked={editorMode === 'preview'}
            onChange={(checked) => handleEditorModeChange(checked ? 'preview' : 'design')}
            checkedChildren="预览"
            unCheckedChildren="编辑"
          />
          <Tooltip title={fullscreen ? '退出全屏' : '全屏'}>
            <Button
              type="text"
              size="small"
              icon={<FullscreenOutlined />}
              onClick={() => setFullscreen(!fullscreen)}
            />
          </Tooltip>
          <Tooltip title="清空">
            <Button
              type="text"
              size="small"
              icon={<ClearOutlined />}
              disabled={readOnly}
              onClick={handleClear}
              danger
            />
          </Tooltip>
          <Button
            type="primary"
            size="small"
            icon={<SaveOutlined />}
            disabled={readOnly}
            onClick={handleSave}
          >
            保存
          </Button>
        </Space>
      </div>

      {/* 主内容区 */}
      <div className="canvas-content">
        {/* 左侧组件库 */}
        {viewMode === 'canvas' && editorMode === 'design' && (
          <div className="canvas-sidebar canvas-sidebar-left">
            <ComponentLibrary />
          </div>
        )}

        {/* 中间画布区 */}
        <div
          className={`canvas-main ${editorMode === 'preview' ? 'preview-mode' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {rootComponent ? (
            <CanvasRenderer
              component={rootComponent}
              editable={editorMode === 'design' && !readOnly}
              preview={editorMode === 'preview'}
            />
          ) : (
            <div className="canvas-empty">
              <div className="empty-icon">🎨</div>
              <div className="empty-title">画布为空</div>
              <div className="empty-description">从左侧拖拽组件到画布开始设计</div>
            </div>
          )}
        </div>

        {/* 右侧属性面板 */}
        {viewMode === 'canvas' && editorMode === 'design' && (
          <div className="canvas-sidebar canvas-sidebar-right">
            <PropertyPanel onDelete={handleDeleteComponent} onCopy={handleCopyComponent} />
          </div>
        )}
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <Modal
        open={fullscreen}
        onCancel={() => setFullscreen(false)}
        footer={null}
        width="95vw"
        style={{ top: 20 }}
        bodyStyle={{ padding: 0, height: 'calc(100vh - 200px)' }}
        closable={false}
      >
        {content}
      </Modal>
    );
  }

  return content;
}

/**
 * 画布模式开关按钮
 */
export function CanvasModeButton({
  tabConfig,
  onSave,
}: {
  tabConfig?: any;
  onSave?: (config: any) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button icon={<EditOutlined />} onClick={() => setVisible(true)}>
        画布编辑
      </Button>
      <CanvasEditor
        visible={visible}
        tabConfig={tabConfig}
        onSave={(config) => {
          onSave?.(config);
          setVisible(false);
        }}
        onCancel={() => setVisible(false)}
      />
    </>
  );
}
