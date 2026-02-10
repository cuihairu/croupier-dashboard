import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Button,
  Space,
  Alert,
  Switch,
  Tag,
  Spin,
  Empty,
  Divider,
  App
} from 'antd';
import {
  EditOutlined,
  EyeOutlined,
  SaveOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { fetchFunctionUiSchema } from '@/services/api/functions';
import UISchemaEditor from '@/components/UISchemaEditor';
import { FunctionFormRenderer, type JSONSchema } from '@/components/FunctionFormRenderer';

const { TabPane } = Tabs;

interface FunctionUIManagerProps {
  functionId: string;
  jsonSchema?: JSONSchema; // 函数的 JSON Schema（用于预览）
  onSave?: (uiSchema: any) => Promise<void>;
}

/**
 * 函数 UI 管理组件
 *
 * 功能：
 * 1. 预览 - 使用 FunctionFormRenderer 实时预览 UI 效果
 * 2. 编辑 - 使用 UISchemaEditor 编辑 UI Schema
 * 3. 启用 - 切换使用默认 UI 或自定义 UI
 */
export default function FunctionUIManager({
  functionId,
  jsonSchema,
  onSave
}: FunctionUIManagerProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uiConfig, setUiConfig] = useState<{
    schema?: any;
    layout?: any;
    components?: any;
  }>({});
  const [editMode, setEditMode] = useState(false);
  const [useCustomUI, setUseCustomUI] = useState(false);
  const [hasDefaultUI, setHasDefaultUI] = useState(false);

  // 加载 UI 配置
  const loadUIConfig = async () => {
    if (!functionId) return;

    setLoading(true);
    try {
      const res = await fetchFunctionUiSchema(functionId);
      const config = {
        schema: res?.schema,
        layout: res?.layout,
        components: res?.components
      };
      setUiConfig(config);

      // 判断是否有默认 UI（从 OpenAPI x-ui）
      // 如果 schema 不为空且不是来自用户自定义，则认为有默认 UI
      setHasDefaultUI(!!config.schema);
      setUseCustomUI(false); // 默认使用原始 UI
    } catch (e: any) {
      message.error(e?.message || '加载 UI 配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUIConfig();
  }, [functionId]);

  // 保存 UI 配置
  const handleSave = async (newUISchema: any) => {
    if (!onSave) {
      message.warning('未配置保存回调');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        schema: newUISchema,
        layout: uiConfig.layout,
        components: uiConfig.components
      });
      message.success('UI 配置保存成功');
      setEditMode(false);
      await loadUIConfig(); // 重新加载
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 切换自定义 UI 开关
  const handleToggleCustomUI = async (checked: boolean) => {
    if (!onSave) {
      message.warning('未配置保存回调');
      return;
    }

    setSaving(true);
    try {
      if (checked) {
        // 启用自定义 UI - 创建空的自定义配置
        await onSave({
          schema: { type: 'object', properties: {} },
          layout: uiConfig.layout,
          components: uiConfig.components
        });
        setUseCustomUI(true);
        setEditMode(true);
      } else {
        // 禁用自定义 UI - 删除自定义配置，恢复默认
        await onSave({
          schema: null, // 删除自定义 UI
          layout: uiConfig.layout,
          components: uiConfig.components
        });
        setUseCustomUI(false);
        setEditMode(false);
        await loadUIConfig();
      }
      message.success(checked ? '已启用自定义 UI' : '已恢复默认 UI');
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin tip="加载 UI 配置..." />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="UI 配置管理"
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadUIConfig}
            loading={loading}
          >
            刷新
          </Button>
          {hasDefaultUI && (
            <Space>
              <span>自定义 UI:</span>
              <Switch
                checked={useCustomUI}
                onChange={handleToggleCustomUI}
                loading={saving}
                checkedChildren="启用"
                unCheckedChildren="禁用"
              />
            </Space>
          )}
        </Space>
      }
    >
      {!hasDefaultUI && !uiConfig.schema ? (
        <Empty description="该函数没有配置 UI Schema" />
      ) : (
        <Tabs
          defaultActiveKey="preview"
          activeKey={editMode ? 'edit' : 'preview'}
          onChange={(key) => {
            if (key === 'edit' && !useCustomUI && hasDefaultUI) {
              message.warning('请先启用自定义 UI 才能编辑');
              return;
            }
            setEditMode(key === 'edit');
          }}
          type="card"
        >
          {/* 预览 Tab */}
          <TabPane
            tab={
              <span>
                <EyeOutlined />
                预览
                {useCustomUI && <Tag color="blue" style={{ marginLeft: 8 }}>自定义</Tag>}
              </span>
            }
            key="preview"
          >
            <Alert
              message="UI 预览"
              description={
                useCustomUI
                  ? "当前使用自定义 UI 配置"
                  : hasDefaultUI
                  ? "当前使用默认 UI 配置（来自 OpenAPI x-ui 扩展）"
                  : "当前无 UI 配置"
              }
              type={useCustomUI ? "success" : "info"}
              showIcon
              style={{ marginBottom: 16 }}
            />

            {jsonSchema ? (
              <FunctionFormRenderer
                schema={jsonSchema}
                uiSchema={uiConfig.schema}
                compact
                submitText="预览提交"
                showReset={false}
              />
            ) : (
              <Alert
                message="无法预览"
                description="缺少函数的 JSON Schema，无法渲染表单预览"
                type="warning"
                showIcon
              />
            )}
          </TabPane>

          {/* 编辑 Tab */}
          <TabPane
            tab={
              <span>
                <EditOutlined />
                编辑
                {editMode && <Tag color="blue" style={{ marginLeft: 8 }}>编辑中</Tag>}
              </span>
            }
            key="edit"
          >
            {!useCustomUI && hasDefaultUI ? (
              <Alert
                message="启用自定义编辑"
                description="请先启用自定义 UI 开关，才能编辑 UI 配置"
                type="warning"
                showIcon
                action={
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => handleToggleCustomUI(true)}
                  >
                    启用自定义 UI
                  </Button>
                }
              />
            ) : (
              <>
                <Alert
                  message="UI Schema 编辑器"
                  description="配置函数参数的表单显示方式（布局、组件、验证规则等）"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                <UISchemaEditor
                  value={uiConfig.schema}
                  onChange={setUiConfig}
                  jsonSchema={jsonSchema}
                />

                <Divider />

                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => handleSave(uiConfig.schema)}
                    loading={saving}
                  >
                    保存更改
                  </Button>
                  <Button
                    icon={<CloseOutlined />}
                    onClick={() => {
                      setEditMode(false);
                      loadUIConfig();
                    }}
                  >
                    取消
                  </Button>
                </Space>
              </>
            )}
          </TabPane>
        </Tabs>
      )}
    </Card>
  );
}
