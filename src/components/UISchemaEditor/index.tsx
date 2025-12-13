import React, { useState, useCallback } from 'react';
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
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  FormOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { jsonParse } from '@/utils/json';

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
  input: { label: 'Input', icon: 'form' },
  textarea: { label: 'Textarea', icon: 'align-left' },
  number: { label: 'Number', icon: 'number' },
  slider: { label: 'Slider', icon: 'swap' },
  rate: { label: 'Rate', icon: 'star' },
  switch: { label: 'Switch', icon: 'swap' },
  checkbox: { label: 'Checkbox', icon: 'check-square' },
  radio: { label: 'Radio', icon: 'dot-circle' },
  select: { label: 'Select', icon: 'select' },
  multiselect: { label: 'Multi Select', icon: 'tags' },
  date: { label: 'Date', icon: 'calendar' },
  datetime: { label: 'DateTime', icon: 'clock-circle' },
  time: { label: 'Time', icon: 'clock-circle' },
  upload: { label: 'Upload', icon: 'upload' },
  color: { label: 'Color', icon: 'bg-colors' },
  password: { label: 'Password', icon: 'eye-invisible' },
  email: { label: 'Email', icon: 'mail' },
  url: { label: 'URL', icon: 'link' },
  phone: { label: 'Phone', icon: 'phone' },
  treeSelect: { label: 'Tree Select', icon: 'apartment' },
  cascader: { label: 'Cascader', icon: 'fork' }
};

// Field Editor Component
const FieldEditor: React.FC<{
  field: string;
  config: FieldConfig;
  schemaType?: string;
  onChange: (field: string, config: FieldConfig) => void;
  onDelete: (field: string) => void;
}> = ({ field, config, schemaType, onChange, onDelete }) => {
  const intl = useIntl();

  const updateConfig = (updates: Partial<FieldConfig>) => {
    onChange(field, { ...config, ...updates });
  };

  return (
    <Card size="small" style={{ marginBottom: 8 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space wrap>
          <Input
            placeholder="Field Name"
            value={field}
            readOnly
            style={{ width: 150 }}
          />
          <Select
            placeholder="Widget"
            value={config.widget || ''}
            onChange={(widget) => updateConfig({ widget: widget || null })}
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
            placeholder="Title"
            value={config.title || ''}
            onChange={(e) => updateConfig({ title: e.target.value || null })}
            style={{ width: 150 }}
          />
          <Button icon={<DeleteOutlined />} danger onClick={() => onDelete(field)} />
        </Space>

        <Space wrap>
          <Input
            placeholder="Placeholder"
            value={config.placeholder || ''}
            onChange={(e) => updateConfig({ placeholder: e.target.value || null })}
            style={{ width: 150 }}
          />
          <InputNumber
            placeholder="Width"
            value={config.width}
            onChange={(value) => updateConfig({ width: value || null })}
            style={{ width: 80 }}
            min={1}
          />
          <InputNumber
            placeholder="Span"
            value={config.span}
            onChange={(value) => updateConfig({ span: value || null })}
            style={{ width: 80 }}
            min={1}
            max={24}
          />
        </Space>

        <Space wrap>
          <Input
            placeholder="CSS Class"
            value={config.class || ''}
            onChange={(e) => updateConfig({ class: e.target.value || null })}
            style={{ width: 150 }}
          />
        </Space>

        <Space wrap>
          <Switch
            checked={config.readOnly || false}
            onChange={(readOnly) => updateConfig({ readOnly })}
            checkedChildren="Read Only"
          />
          <Switch
            checked={config.disabled || false}
            onChange={(disabled) => updateConfig({ disabled })}
            checkedChildren="Disabled"
          />
          <Switch
            checked={config.hidden || false}
            onChange={(hidden) => updateConfig({ hidden })}
            checkedChildren="Hidden"
          />
        </Space>

        {/* Default value based on type */}
        {config.default !== undefined && (
          <Space wrap>
            <span>Default:</span>
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
        {(config.widget === 'select' || config.widget === 'radio' || config.widget === 'multiselect') && (
          <Space wrap>
            <span>Options:</span>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: 'Add Option',
                  content: (
                    <div style={{ marginTop: 16 }}>
                      <Input
                        placeholder="Value"
                        id="enum-value"
                        style={{ marginBottom: 8 }}
                      />
                      <Input
                        placeholder="Label"
                        id="enum-label"
                      />
                    </div>
                  ),
                  onOk: () => {
                    const valueInput = document.getElementById('enum-value') as HTMLInputElement;
                    const labelInput = document.getElementById('enum-label') as HTMLInputElement;
                    if (valueInput && labelInput) {
                      const newEnum = [...(config.enum || []), valueInput.value];
                      const newEnumNames = [...(config.enumNames || []), labelInput.value];
                      updateConfig({
                        enum: newEnum,
                        enumNames: newEnumNames
                      });
                    }
                  }
                });
              }}
            >
              Add Option
            </Button>
            {config.enum?.map((val: any, index: number) => (
              <Tag
                key={index}
                closable
                onClose={() => {
                  const newEnum = [...config.enum];
                  const newEnumNames = [...(config.enumNames || [])];
                  newEnum.splice(index, 1);
                  newEnumNames.splice(index, 1);
                  updateConfig({
                    enum: newEnum.length > 0 ? newEnum : undefined,
                    enumNames: newEnumNames.length > 0 ? newEnumNames : undefined
                  });
                }}
              >
                {config.enumNames?.[index] || val}
              </Tag>
            ))}
          </Space>
        )}

        {/* Help text */}
        {config.description && (
          <Alert
            message={config.description}
            type="info"
            size="small"
            showIcon={false}
          />
        )}
      </Space>
    </Card>
  );
};

export default function UISchemaEditor({ value, onChange, jsonSchema }: UISchemaEditorProps) {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [jsonError, setJsonError] = useState<string>('');
  const [uiSchemaData, setUiSchemaData] = useState<any>(value || {
    type: 'object',
    properties: {}
  });

  const handleVisualChange = useCallback((newData: any) => {
    setUiSchemaData(newData);
    onChange?.(newData);
  }, [onChange]);

  const handleCodeChange = (jsonString: string) => {
    try {
      const parsed = jsonParse(jsonString);
      setUiSchemaData(parsed);
      onChange?.(parsed);
      setJsonError('');
    } catch (error: any) {
      setJsonError(error.message || 'Invalid JSON');
    }
  };

  const addCommonField = (type: string) => {
    const propName = `new${type.charAt(0).toUpperCase() + type.slice(1)}${Object.keys(uiSchemaData.properties || {}).length + 1}`;
    const fieldConfig: FieldConfig = {
      type: type,
      title: propName,
      description: `A ${type} field`,
      widget: type === 'array' ? 'multiselect' : type === 'boolean' ? 'switch' : type
    };

    handleVisualChange({
      ...uiSchemaData,
      properties: {
        ...uiSchemaData.properties,
        [propName]: fieldConfig
      }
    });
  };

  const getSuggestedFields = () => {
    if (!jsonSchema?.properties) return [];

    return Object.keys(jsonSchema.properties).map(key => ({
      field: key,
      schemaType: jsonSchema.properties[key]?.type || 'string',
      suggested: {
        widget: jsonSchema.properties[key]?.type === 'string' ? 'input' :
                 jsonSchema.properties[key]?.type === 'number' ? 'number' :
                 jsonSchema.properties[key]?.type === 'boolean' ? 'switch' :
                 jsonSchema.properties[key]?.type === 'array' ? 'multiselect' : 'input'
      }
    }));
  };

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Button.Group>
            <Button icon={<PlusOutlined />} onClick={() => addCommonField('string')}>
              Add String
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => addCommonField('number')}>
              Add Number
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => addCommonField('boolean')}>
              Add Boolean
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => addCommonField('select')}>
              Add Select
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => addCommonField('textarea')}>
              Add Textarea
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => addCommonField('date')}>
              Add Date
            </Button>
          </Button.Group>

          {jsonSchema && (
            <Tooltip title="Suggest fields based on JSON Schema">
              <Button icon={<FormOutlined />}>
                Suggest Fields
              </Button>
            </Tooltip>
          )}

          <div style={{ marginLeft: 'auto' }}>
            <Button.Group>
              <Button
                type={activeTab === 'visual' ? 'primary' : 'default'}
                onClick={() => setActiveTab('visual')}
              >
                Visual Editor
              </Button>
              <Button
                type={activeTab === 'code' ? 'primary' : 'default'}
                onClick={() => setActiveTab('code')}
              >
                JSON Code
              </Button>
            </Button.Group>
          </div>
        </Space>

        <Alert
          message="UI Schema Editor"
          description="Configure how fields are displayed and behave in forms. The UI Schema controls form widgets, validation, and layout."
          type="info"
          showIcon
          icon={<QuestionCircleOutlined />}
        />

        {activeTab === 'visual' ? (
          <div>
            <Divider />
            <Collapse ghost defaultActiveKey={Object.keys(uiSchemaData.properties || {})}>
              {Object.entries(uiSchemaData.properties || {}).map(([field, config]) => (
                <Panel
                  header={
                    <Space>
                      <strong>{field}</strong>
                      <Tag>{config.type || 'string'}</Tag>
                      {config.widget && <Tag color="blue">{config.widget}</Tag>}
                      {config.hidden && <Tag color="gray">Hidden</Tag>}
                      {config.readOnly && <Tag color="orange">Read Only</Tag>}
                    </Space>
                  }
                  key={field}
                >
                  <FieldEditor
                    field={field}
                    config={config}
                    schemaType={jsonSchema?.properties?.[field]?.type}
                    onChange={updateConfig}
                    onDelete={handleDeleteField}
                  />
                </Panel>
              ))}
            </Collapse>
          </div>
        ) : (
          <div>
            <TextArea
              value={JSON.stringify(uiSchemaData, null, 2)}
              onChange={(e) => handleCodeChange(e.target.value)}
              rows={20}
              placeholder="Paste or edit UI Schema here..."
              style={{ fontFamily: 'Monaco, Consolas, monospace' }}
            />
            {jsonError && (
              <Alert
                message="JSON Error"
                description={jsonError}
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

  function updateConfig(property: string, config: FieldConfig) {
    handleVisualChange({
      ...uiSchemaData,
      properties: {
        ...uiSchemaData.properties,
        [property]: config
      }
    });
  }

  function handleDeleteField(field: string) {
    const newProperties = { ...uiSchemaData.properties };
    delete newProperties[field];
    handleVisualChange({
      ...uiSchemaData,
      properties: newProperties
    });
  }
}