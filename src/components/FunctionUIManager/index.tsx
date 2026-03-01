import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Alert,
  Switch,
  Tag,
  Spin,
  Empty,
  Divider,
  App,
  Select,
  Popconfirm,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import {
  fetchFunctionUiHistory,
  fetchFunctionUiSchema,
  rollbackFunctionUiSchema,
} from '@/services/api/functions';
import SchemaRenderer from '@/components/formily/SchemaRenderer';
import UISchemaEditor from '@/components/UISchemaEditor';
import { FunctionFormRenderer, type JSONSchema } from '@/components/FunctionFormRenderer';
import { featureFlags } from '@/config/featureFlags';
import { fetchOptions } from '@/services/schema/async';

interface FunctionUIManagerProps {
  functionId: string;
  jsonSchema?: JSONSchema;
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
  onSave,
}: FunctionUIManagerProps) {
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uiConfig, setUiConfig] = useState<{
    schema?: any;
    layout?: any;
    components?: any;
  }>({});
  const [useCustomUI, setUseCustomUI] = useState(false);
  const [hasDefaultUI, setHasDefaultUI] = useState(false);
  const [uiSource, setUISource] = useState<string>('none');
  const [uiSourceDetail, setUISourceDetail] = useState<string>('');
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [originalSchema, setOriginalSchema] = useState<any>(undefined);
  const [isDirty, setIsDirty] = useState(false);
  const [historyItems, setHistoryItems] = useState<
    { version: number; createdAt?: string; createdBy?: string; message?: string }[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [rollbackVersion, setRollbackVersion] = useState<number | undefined>();

  const sourceMeta: Record<string, { label: string; color: string }> = {
    custom_metadata: { label: '自定义元数据', color: 'blue' },
    config_file_override: { label: '配置文件覆盖', color: 'purple' },
    openapi_x_ui: { label: 'OpenAPI x-ui', color: 'green' },
    none: { label: '未配置', color: 'default' },
  };
  const sourceDisplay = sourceMeta[uiSource] || { label: uiSource || '未知', color: 'default' };

  // 加载 UI 配置
  const loadUIConfig = async () => {
    if (!functionId) return;

    setLoading(true);
    try {
      const res = await fetchFunctionUiSchema(functionId);
      const config = {
        schema: res?.schema,
        layout: res?.layout,
        components: res?.components,
      };
      setUiConfig(config);
      setOriginalSchema(config.schema);
      setIsDirty(false);

      const custom = !!res?.custom;
      const hasDefault =
        typeof res?.hasDefault === 'boolean' ? res.hasDefault : !!config.schema && !custom;
      setUseCustomUI(custom);
      setHasDefaultUI(hasDefault);
      setUISource(
        res?.uiSource || (custom ? 'custom_metadata' : hasDefault ? 'openapi_x_ui' : 'none'),
      );
      setUISourceDetail(res?.uiSourceDetail || '');
      setUpdatedAt(res?.updated_at || '');
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setUiConfig({});
        setOriginalSchema(undefined);
        setUseCustomUI(false);
        setHasDefaultUI(false);
        setUISource('none');
        setUISourceDetail('');
        setUpdatedAt('');
        setIsDirty(false);
      } else {
        message.error(e?.message || '加载 UI 配置失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUIHistory = async () => {
    if (!functionId) return;
    setHistoryLoading(true);
    try {
      const res = await fetchFunctionUiHistory(functionId);
      const items = Array.isArray(res?.items) ? res.items : [];
      setHistoryItems(items);
      setRollbackVersion(items[0]?.version);
    } catch {
      setHistoryItems([]);
      setRollbackVersion(undefined);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadUIConfig();
    loadUIHistory();
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
        components: uiConfig.components,
      });
      message.success('UI 配置保存成功');
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
        // 启用自定义 UI - 基于当前可见 schema 初始化，避免编辑器空白
        const initialSchema =
          uiConfig.schema && typeof uiConfig.schema === 'object'
            ? uiConfig.schema
            : { type: 'object', properties: {} };
        await onSave({
          schema: initialSchema,
          layout: uiConfig.layout,
          components: uiConfig.components,
        });
        setUseCustomUI(true);
      } else {
        // 禁用自定义 UI - 后端识别该标记后清理 metadata.ui
        await onSave({
          schema: { __clear_custom_ui: true },
          layout: uiConfig.layout,
          components: uiConfig.components,
        });
        setUseCustomUI(false);
      }
      await loadUIConfig();
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
          <Tag color={useCustomUI ? 'blue' : hasDefaultUI ? 'green' : 'default'}>
            {useCustomUI ? '当前: 自定义' : hasDefaultUI ? '当前: 默认' : '当前: 未配置'}
          </Tag>
          <Tag>来源: {sourceDisplay.label}</Tag>
          <Tag color={sourceDisplay.color}>source={uiSource}</Tag>
          <Button icon={<ReloadOutlined />} onClick={loadUIConfig} loading={loading}>
            刷新
          </Button>
          <Select
            size="small"
            style={{ minWidth: 220 }}
            placeholder="选择历史版本"
            loading={historyLoading}
            value={rollbackVersion}
            onChange={setRollbackVersion}
            options={historyItems.map((it) => ({
              label: `v${it.version} ${
                it.createdAt ? new Date(it.createdAt).toLocaleString('zh-CN') : ''
              }`,
              value: it.version,
            }))}
          />
          <Popconfirm
            title="确认回滚 UI 配置？"
            description={rollbackVersion ? `将回滚到版本 v${rollbackVersion}` : '请选择版本'}
            onConfirm={async () => {
              if (!rollbackVersion) return;
              try {
                setSaving(true);
                await rollbackFunctionUiSchema(functionId, rollbackVersion);
                message.success(`已回滚到版本 v${rollbackVersion}`);
                await loadUIConfig();
                await loadUIHistory();
              } catch (e: any) {
                message.error(e?.message || '回滚失败');
              } finally {
                setSaving(false);
              }
            }}
            okButtonProps={{ disabled: !rollbackVersion }}
          >
            <Button size="small" disabled={!rollbackVersion} loading={saving}>
              回滚
            </Button>
          </Popconfirm>
          {featureFlags.formilyDesigner && (
            <Button
              type="primary"
              onClick={() =>
                history.push(`/game/functions/${encodeURIComponent(functionId)}/ui-designer`)
              }
            >
              打开设计器
            </Button>
          )}
          {(hasDefaultUI || useCustomUI) && (
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
      ) : featureFlags.formilyDesigner ? (
        <>
          <Alert
            message="UI 预览"
            description={
              useCustomUI
                ? '当前使用自定义 UI 配置'
                : hasDefaultUI
                ? '当前使用默认 UI 配置（来自 OpenAPI x-ui 扩展）'
                : '当前无 UI 配置'
            }
            type={useCustomUI ? 'success' : 'info'}
            showIcon
            style={{ marginBottom: 16 }}
          />
          {uiSourceDetail && (
            <Alert
              message="UI 来源详情"
              description={uiSourceDetail}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          {updatedAt && (
            <Alert
              message="最近更新时间"
              description={new Date(updatedAt).toLocaleString('zh-CN')}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <SchemaRenderer
            schema={uiConfig.schema}
            readOnly={false}
            context={{
              gameId:
                typeof window !== 'undefined'
                  ? localStorage.getItem('game_id') || undefined
                  : undefined,
              env:
                typeof window !== 'undefined'
                  ? localStorage.getItem('env') || undefined
                  : undefined,
              functionId,
              permissions: String((initialState as any)?.currentUser?.access || '')
                .split(',')
                .filter(Boolean),
            }}
            scope={{
              hasPerm: (perm: string) =>
                String((initialState as any)?.currentUser?.access || '')
                  .split(',')
                  .filter(Boolean)
                  .includes(perm),
              fetchOptions,
            }}
          />
        </>
      ) : (
        <>
          <Alert
            message="UI 预览（Legacy）"
            description="当前使用旧版 UI Schema 预览与编辑"
            type="info"
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

          <Divider />

          {!useCustomUI && hasDefaultUI ? (
            <Alert
              message="启用自定义编辑"
              description="请先启用自定义 UI 开关，才能编辑 UI 配置"
              type="warning"
              showIcon
              action={
                <Button type="primary" size="small" onClick={() => handleToggleCustomUI(true)}>
                  启用自定义 UI
                </Button>
              }
            />
          ) : (
            <>
              {isDirty && (
                <Alert
                  message="有未保存修改"
                  description="请点击“保存更改”提交，或“重置更改/取消”放弃本次编辑。"
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
              <UISchemaEditor
                value={uiConfig.schema}
                jsonSchema={jsonSchema}
                onChange={(newSchema) => {
                  const changed =
                    JSON.stringify(newSchema ?? null) !== JSON.stringify(originalSchema ?? null);
                  setUiConfig((prev) => ({
                    ...prev,
                    schema: newSchema,
                  }));
                  setIsDirty(changed);
                }}
              />

              <Divider />

              <Space>
                <Button
                  type="primary"
                  onClick={() => handleSave(uiConfig.schema)}
                  loading={saving}
                  disabled={!isDirty}
                >
                  保存更改
                </Button>
                <Button
                  disabled={!isDirty}
                  onClick={() => {
                    setUiConfig((prev) => ({
                      ...prev,
                      schema: originalSchema,
                    }));
                    setIsDirty(false);
                  }}
                >
                  重置更改
                </Button>
                <Button
                  onClick={() => {
                    loadUIConfig();
                  }}
                >
                  取消
                </Button>
              </Space>
            </>
          )}
        </>
      )}
    </Card>
  );
}
