import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  Space,
  Button,
  Select,
  Switch,
  Input,
  InputNumber,
  Collapse,
  Tag,
  Divider,
  Alert,
  Dropdown,
  Menu,
  Empty,
  Modal,
  Radio,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { jsonParse } from '@/utils/json';
import { CodeEditor } from '@/components/MonacoDynamic';

const { Panel } = Collapse;
const { TextArea } = Input;
const { Option } = Select;

interface FieldConfig {
  type?: string;
  title?: string;
  description?: string;
  placeholder?: string;
  default?: any;
  widget?: string;
  enum?: any[];
  enumNames?: any[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  readOnly?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  width?: string | number;
  span?: number;
  dependencies?: string[];
  colon?: boolean;
  rules?: any[];
  widgetProps?: Record<string, any>;
  class?: string;
  style?: Record<string, any>;
}

interface UISchemaEditorProps {
  value?: any;
  onChange?: (value: any) => void;
  jsonSchema?: any; // JSON Schema for validation reference
}

// Widget options mapping
const WIDGET_OPTIONS = {
  input: { label: '输入框', icon: 'form' },
  textarea: { label: '多行文本', icon: 'align-left' },
  number: { label: '数字', icon: 'number' },
  slider: { label: '滑块', icon: 'swap' },
  rate: { label: '评分', icon: 'star' },
  switch: { label: '开关', icon: 'swap' },
  checkbox: { label: '复选框', icon: 'check-square' },
  radio: { label: '单选框', icon: 'dot-circle' },
  select: { label: '下拉选择', icon: 'select' },
  multiselect: { label: '多选下拉', icon: 'tags' },
  date: { label: '日期', icon: 'calendar' },
  datetime: { label: '日期时间', icon: 'clock-circle' },
  time: { label: '时间', icon: 'clock-circle' },
  upload: { label: '上传', icon: 'upload' },
  color: { label: '颜色', icon: 'bg-colors' },
  password: { label: '密码', icon: 'eye-invisible' },
  email: { label: '邮箱', icon: 'mail' },
  url: { label: '链接', icon: 'link' },
  phone: { label: '手机号', icon: 'phone' },
  treeSelect: { label: '树选择', icon: 'apartment' },
  cascader: { label: '级联选择', icon: 'fork' },
};

function parsePositionFromJsonError(errorMessage: string): number | null {
  const match = errorMessage.match(/position\s+(\d+)/i);
  if (!match) return null;
  const pos = Number(match[1]);
  return Number.isFinite(pos) ? pos : null;
}

function getLineColumnByOffset(text: string, offset: number) {
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  const prefix = text.slice(0, safeOffset);
  const lines = prefix.split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { line, column };
}

function parseEnumBulkInput(raw: string, mode: 'json' | 'csv') {
  const values: any[] = [];
  const labels: string[] = [];

  if (mode === 'json') {
    const parsed = jsonParse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('JSON 导入格式必须是数组');
    }
    parsed.forEach((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        values.push((item as any).value);
        labels.push(String((item as any).label ?? (item as any).value ?? ''));
      } else {
        values.push(item);
        labels.push(String(item ?? ''));
      }
    });
    return { values, labels };
  }

  const rows = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  rows.forEach((row) => {
    const [value, label] = row.split(',').map((x) => x?.trim());
    values.push(value ?? '');
    labels.push(label || value || '');
  });
  return { values, labels };
}

// Field Editor Component
const FieldEditor: React.FC<{
  field: string;
  config: FieldConfig;
  schemaType?: string;
  onChange: (field: string, config: FieldConfig) => void;
  onDelete: (field: string) => void;
}> = ({ field, config, onChange, onDelete }) => {
  const [enumModalOpen, setEnumModalOpen] = useState(false);
  const [enumValue, setEnumValue] = useState('');
  const [enumLabel, setEnumLabel] = useState('');
  const [importMode, setImportMode] = useState<'json' | 'csv'>('json');
  const [bulkText, setBulkText] = useState('');

  const openEnumModal = () => {
    setEnumValue('');
    setEnumLabel('');
    setImportMode('json');
    setBulkText('');
    setEnumModalOpen(true);
  };

  const updateConfig = (updates: Partial<FieldConfig>) => {
    onChange(field, { ...config, ...updates });
  };

  const appendEnums = (incomingValues: any[], incomingLabels: string[]) => {
    const nextEnum = [...(config.enum || []), ...incomingValues];
    const nextNames = [...(config.enumNames || []), ...incomingLabels];
    updateConfig({
      enum: nextEnum.length > 0 ? nextEnum : undefined,
      enumNames: nextNames.length > 0 ? nextNames : undefined,
    });
  };

  return (
    <Card size="small" style={{ marginBottom: 8 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space wrap>
          <Input placeholder="字段名" value={field} readOnly style={{ width: 150 }} />
          <Select
            placeholder="组件类型"
            value={config.widget || ''}
            onChange={(widget) => updateConfig({ widget: widget || undefined })}
            style={{ width: 120 }}
            showSearch
          >
            {Object.entries(WIDGET_OPTIONS).map(([key, opt]) => (
              <Option key={key} value={key}>
                <Space>
                  {opt.icon && <span>{opt.icon}</span>}
                  {opt.label}
                </Space>
              </Option>
            ))}
          </Select>
          <Input
            placeholder="标题"
            value={config.title || ''}
            onChange={(e) => updateConfig({ title: e.target.value || undefined })}
            style={{ width: 150 }}
          />
          <Button icon={<DeleteOutlined />} danger onClick={() => onDelete(field)} />
        </Space>

        <Space wrap>
          <Input
            placeholder="占位提示"
            value={config.placeholder || ''}
            onChange={(e) => updateConfig({ placeholder: e.target.value || undefined })}
            style={{ width: 150 }}
          />
          <InputNumber
            placeholder="宽度"
            value={config.width}
            onChange={(value) => updateConfig({ width: value || undefined })}
            style={{ width: 80 }}
            min={1}
          />
          <InputNumber
            placeholder="栅格"
            value={config.span}
            onChange={(value) => updateConfig({ span: value || undefined })}
            style={{ width: 80 }}
            min={1}
            max={24}
          />
        </Space>

        <Space wrap>
          <Input
            placeholder="CSS 类名"
            value={config.class || ''}
            onChange={(e) => updateConfig({ class: e.target.value || undefined })}
            style={{ width: 150 }}
          />
        </Space>

        <Space wrap>
          <Switch
            checked={config.readOnly || false}
            onChange={(readOnly) => updateConfig({ readOnly })}
            checkedChildren="只读"
          />
          <Switch
            checked={config.disabled || false}
            onChange={(disabled) => updateConfig({ disabled })}
            checkedChildren="禁用"
          />
          <Switch
            checked={config.hidden || false}
            onChange={(hidden) => updateConfig({ hidden })}
            checkedChildren="隐藏"
          />
        </Space>

        {/* Default value based on type */}
        {config.default !== undefined && (
          <Space wrap>
            <span>默认值:</span>
            {typeof config.default === 'object' ? (
              <TextArea
                rows={2}
                value={JSON.stringify(config.default, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = jsonParse(e.target.value);
                    updateConfig({ default: parsed });
                  } catch {
                    updateConfig({ default: e.target.value });
                  }
                }}
                style={{ width: 200 }}
              />
            ) : (
              <Input
                value={String(config.default)}
                onChange={(e) => updateConfig({ default: e.target.value })}
                style={{ width: 150 }}
              />
            )}
          </Space>
        )}

        {/* Enum values for select widgets */}
        {(config.widget === 'select' ||
          config.widget === 'radio' ||
          config.widget === 'multiselect') && (
          <Space wrap>
            <span>枚举选项:</span>
            <Button size="small" icon={<PlusOutlined />} onClick={openEnumModal}>
              管理选项
            </Button>
            {config.enum?.map((val: any, index: number) => (
              <Tag
                key={index}
                closable
                onClose={() => {
                  const newEnum = [...(config.enum || [])];
                  const newEnumNames = [...(config.enumNames || [])];
                  newEnum.splice(index, 1);
                  newEnumNames.splice(index, 1);
                  updateConfig({
                    enum: newEnum.length > 0 ? newEnum : undefined,
                    enumNames: newEnumNames.length > 0 ? newEnumNames : undefined,
                  });
                }}
              >
                {config.enumNames?.[index] || val}
              </Tag>
            ))}
            <Modal
              title={`编辑枚举选项 - ${field}`}
              open={enumModalOpen}
              onCancel={() => setEnumModalOpen(false)}
              footer={null}
              destroyOnClose
            >
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={enumValue}
                    onChange={(e) => setEnumValue(e.target.value)}
                    placeholder="值 value"
                  />
                  <Input
                    value={enumLabel}
                    onChange={(e) => setEnumLabel(e.target.value)}
                    placeholder="显示名 label"
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      if (!enumValue.trim()) return;
                      appendEnums([enumValue], [enumLabel || enumValue]);
                      setEnumValue('');
                      setEnumLabel('');
                    }}
                  >
                    添加
                  </Button>
                </Space.Compact>
                <Divider style={{ margin: 0 }} />
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Radio.Group
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value)}
                    optionType="button"
                    buttonStyle="solid"
                  >
                    <Radio.Button value="json">JSON 导入</Radio.Button>
                    <Radio.Button value="csv">CSV 导入</Radio.Button>
                  </Radio.Group>
                  <TextArea
                    rows={6}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={
                      importMode === 'json'
                        ? '示例: [{"value":"1","label":"启用"},{"value":"0","label":"禁用"}]'
                        : '示例:\n1,启用\n0,禁用'
                    }
                  />
                  <Button
                    onClick={() => {
                      try {
                        const { values, labels } = parseEnumBulkInput(bulkText, importMode);
                        if (values.length === 0) return;
                        appendEnums(values, labels);
                        setBulkText('');
                      } catch (e: any) {
                        Modal.error({
                          title: '导入失败',
                          content: e?.message || '请检查导入格式',
                        });
                      }
                    }}
                  >
                    批量导入
                  </Button>
                </Space>
              </Space>
            </Modal>
          </Space>
        )}

        {/* Help text */}
        {config.description && <Alert message={config.description} type="info" showIcon={false} />}
      </Space>
    </Card>
  );
};

export default function UISchemaEditor({ value, onChange, jsonSchema }: UISchemaEditorProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [jsonError, setJsonError] = useState<string>('');
  const [jsonErrorLine, setJsonErrorLine] = useState<number | null>(null);
  const buildUISchema = (input?: any) => {
    if (
      !input ||
      typeof input !== 'object' ||
      Array.isArray(input) ||
      Object.keys(input).length === 0
    ) {
      return {
        type: 'object',
        properties: {},
      };
    }
    return input;
  };
  const [uiSchemaData, setUiSchemaData] = useState<any>(buildUISchema(value));
  const [jsonDraft, setJsonDraft] = useState<string>(JSON.stringify(buildUISchema(value), null, 2));
  const monacoRef = useRef<any>(null);
  const editorRef = useRef<any>(null);

  const setMonacoMarker = useCallback((line?: number, column?: number, message?: string) => {
    if (!monacoRef.current || !editorRef.current) return;
    const monaco = monacoRef.current;
    const model = editorRef.current.getModel?.();
    if (!model) return;
    if (!line || !column || !message) {
      monaco.editor.setModelMarkers(model, 'ui-schema-editor', []);
      return;
    }
    monaco.editor.setModelMarkers(model, 'ui-schema-editor', [
      {
        startLineNumber: line,
        startColumn: column,
        endLineNumber: line,
        endColumn: column + 1,
        message,
        severity: monaco.MarkerSeverity.Error,
      },
    ]);
  }, []);

  const handleMonacoMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  }, []);

  useEffect(() => {
    const next = buildUISchema(value);
    setUiSchemaData(next);
    setJsonDraft(JSON.stringify(next, null, 2));
    setJsonError('');
    setJsonErrorLine(null);
    setMonacoMarker();
  }, [value]);

  const handleVisualChange = useCallback(
    (newData: any) => {
      setUiSchemaData(newData);
      setJsonDraft(JSON.stringify(newData, null, 2));
      setJsonError('');
      setJsonErrorLine(null);
      setMonacoMarker();
      onChange?.(newData);
    },
    [onChange, setMonacoMarker],
  );

  const handleCodeChange = (jsonString: string) => {
    setJsonDraft(jsonString);
    try {
      const parsed = jsonParse(jsonString);
      setUiSchemaData(parsed);
      onChange?.(parsed);
      setJsonError('');
      setJsonErrorLine(null);
      setMonacoMarker();
    } catch (error: any) {
      const msg = error?.message || 'JSON 格式错误';
      const pos = parsePositionFromJsonError(msg);
      if (pos === null) {
        setJsonError(msg);
        setJsonErrorLine(null);
        setMonacoMarker();
        return;
      }
      const { line, column } = getLineColumnByOffset(jsonString, pos);
      setJsonError(msg);
      setJsonErrorLine(line);
      setMonacoMarker(line, column, msg);
    }
  };

  const updateConfig = useCallback(
    (property: string, config: FieldConfig) => {
      handleVisualChange({
        ...uiSchemaData,
        properties: {
          ...uiSchemaData.properties,
          [property]: config,
        },
      });
    },
    [uiSchemaData, handleVisualChange],
  );

  const handleDeleteField = useCallback(
    (field: string) => {
      const newProperties = { ...uiSchemaData.properties };
      delete newProperties[field];
      handleVisualChange({
        ...uiSchemaData,
        properties: newProperties,
      });
    },
    [uiSchemaData, handleVisualChange],
  );

  const addCommonField = (type: string) => {
    const propName = `new${type.charAt(0).toUpperCase() + type.slice(1)}${
      Object.keys(uiSchemaData.properties || {}).length + 1
    }`;
    const fieldConfig: FieldConfig = {
      type: type,
      title: propName,
      description: `A ${type} field`,
      widget: type === 'array' ? 'multiselect' : type === 'boolean' ? 'switch' : type,
    };

    handleVisualChange({
      ...uiSchemaData,
      properties: {
        ...uiSchemaData.properties,
        [propName]: fieldConfig,
      },
    });
  };

  // Add field from JSON Schema suggestion
  const addFieldFromSchema = (field: string, schemaType: string) => {
    const widget =
      schemaType === 'string'
        ? 'input'
        : schemaType === 'number' || schemaType === 'integer'
        ? 'number'
        : schemaType === 'boolean'
        ? 'switch'
        : schemaType === 'array'
        ? 'multiselect'
        : 'input';

    const fieldConfig: FieldConfig = {
      type: schemaType,
      title: field,
      widget,
    };

    handleVisualChange({
      ...uiSchemaData,
      properties: {
        ...uiSchemaData.properties,
        [field]: fieldConfig,
      },
    });
  };

  const getSuggestedFields = () => {
    if (!jsonSchema?.properties) return [];

    const existingFields = Object.keys(uiSchemaData.properties || {});
    return Object.keys(jsonSchema.properties)
      .filter((key) => !existingFields.includes(key))
      .map((key) => ({
        field: key,
        schemaType: jsonSchema.properties[key]?.type || 'string',
      }));
  };

  const suggestedFields = useMemo(
    () => getSuggestedFields(),
    [jsonSchema, uiSchemaData.properties],
  );

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Button.Group>
            <Button icon={<PlusOutlined />} onClick={() => addCommonField('string')}>
              添加字符串
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => addCommonField('number')}>
              添加数字
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => addCommonField('boolean')}>
              添加布尔
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => addCommonField('select')}>
              添加选择器
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => addCommonField('textarea')}>
              添加文本域
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => addCommonField('date')}>
              添加日期
            </Button>
          </Button.Group>

          {jsonSchema && (
            <Dropdown
              trigger={['click']}
              overlay={
                <Menu style={{ maxHeight: 300, overflow: 'auto' }}>
                  {suggestedFields.length > 0 ? (
                    suggestedFields.map(({ field, schemaType }) => (
                      <Menu.Item key={field} onClick={() => addFieldFromSchema(field, schemaType)}>
                        <Space>
                          <Tag
                            color={
                              schemaType === 'string'
                                ? 'blue'
                                : schemaType === 'number'
                                ? 'green'
                                : schemaType === 'boolean'
                                ? 'orange'
                                : schemaType === 'array'
                                ? 'purple'
                                : 'default'
                            }
                          >
                            {schemaType}
                          </Tag>
                          <span>{field}</span>
                        </Space>
                      </Menu.Item>
                    ))
                  ) : (
                    <Menu.Item disabled>
                      <Empty description="已全部导入" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    </Menu.Item>
                  )}
                </Menu>
              }
            >
              <Button icon={<DownOutlined />}>
                从 JSON Schema 导入 ({suggestedFields.length})
              </Button>
            </Dropdown>
          )}

          <div style={{ marginLeft: 'auto' }}>
            <Button.Group>
              <Button
                type={activeTab === 'visual' ? 'primary' : 'default'}
                onClick={() => setActiveTab('visual')}
              >
                可视化编辑
              </Button>
              <Button
                type={activeTab === 'code' ? 'primary' : 'default'}
                onClick={() => setActiveTab('code')}
              >
                JSON 代码
              </Button>
            </Button.Group>
          </div>
        </Space>

        <Alert
          message="UI Schema 编辑器"
          description="用于配置表单字段的展示和行为，包括组件类型、校验和布局。"
          type="info"
          showIcon
          icon={<QuestionCircleOutlined />}
        />

        {activeTab === 'visual' ? (
          <div>
            <Divider />
            <Collapse ghost defaultActiveKey={Object.keys(uiSchemaData.properties || {})}>
              {(Object.entries(uiSchemaData.properties || {}) as [string, FieldConfig][]).map(
                ([field, config]) => (
                  <Panel
                    header={
                      <Space>
                        <strong>{field}</strong>
                        <Tag>{config.type || 'string'}</Tag>
                        {config.widget && <Tag color="blue">{config.widget}</Tag>}
                        {config.hidden && <Tag color="gray">隐藏</Tag>}
                        {config.readOnly && <Tag color="orange">只读</Tag>}
                      </Space>
                    }
                    key={field}
                  >
                    <FieldEditor
                      field={field}
                      config={config}
                      onChange={updateConfig}
                      onDelete={handleDeleteField}
                    />
                  </Panel>
                ),
              )}
            </Collapse>
          </div>
        ) : (
          <div>
            <CodeEditor
              value={jsonDraft}
              language="json"
              height={420}
              onChange={handleCodeChange}
              onMount={handleMonacoMount}
              options={{
                automaticLayout: true,
                fontSize: 13,
                tabSize: 2,
                formatOnPaste: true,
                formatOnType: true,
                scrollBeyondLastLine: false,
              }}
            />
            {jsonError && (
              <Alert
                message="JSON 错误"
                description={jsonErrorLine ? `${jsonError}（第 ${jsonErrorLine} 行）` : jsonError}
                type="error"
                showIcon
                style={{ marginTop: 8 }}
              />
            )}
          </div>
        )}
      </Space>
    </Card>
  );
}
