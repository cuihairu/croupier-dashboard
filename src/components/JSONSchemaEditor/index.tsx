import React, { useState, useCallback } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Select,
  Switch,
  InputNumber,
  Collapse,
  Divider,
  Alert,
  Tag,
  List,
  Modal
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  EyeOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  FunctionOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import type { FormInstance } from 'antd/es/form';
import { jsonParse } from '@/utils/json';

const { Panel } = Collapse;
const { TextArea } = Input;
const { Option } = Select;

interface PropertyConfig {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  title?: string;
  description?: string;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  required?: boolean;
  readOnly?: boolean;
  const?: any;
  $ref?: string;
  // Array specific
  items?: PropertyConfig;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  // Object specific
  properties?: Record<string, PropertyConfig>;
  additionalProperties?: boolean | PropertyConfig;
  requiredProperties?: string[];
  // UI specific
  widget?: string;
  placeholder?: string;
  help?: string;
}

interface JSONSchemaEditorProps {
  value?: any;
  onChange?: (value: any) => void;
  schemaFormSchema?: any;
}

// 内联属性编辑器
const InlinePropertyEditor: React.FC<{
  property: string;
  config: PropertyConfig;
  onChange: (property: string, config: PropertyConfig) => void;
  onDelete: (property: string) => void;
}> = ({ property, config, onChange, onDelete }) => {
  const intl = useIntl();

  const updateConfig = (updates: Partial<PropertyConfig>) => {
    onChange(property, { ...config, ...updates });
  };

  return (
    <Card size="small" style={{ marginBottom: 8 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Input
            placeholder="Property Name"
            value={property}
            onChange={(e) => {
              const newProp = e.target.value;
              onDelete(property);
              onChange(newProp, config);
            }}
            style={{ width: 200 }}
          />
          <Select
            value={config.type}
            onChange={(type) => updateConfig({ type: type as PropertyConfig['type'] })}
            style={{ width: 120 }}
          >
            <Option value="string">String</Option>
            <Option value="number">Number</Option>
            <Option value="integer">Integer</Option>
            <Option value="boolean">Boolean</Option>
            <Option value="array">Array</Option>
            <Option value="object">Object</Option>
          </Select>
          <Input
            placeholder="Title"
            value={config.title || ''}
            onChange={(e) => updateConfig({ title: e.target.value })}
            style={{ width: 150 }}
          />
          <Input
            placeholder="Description"
            value={config.description || ''}
            onChange={(e) => updateConfig({ description: e.target.value })}
            style={{ width: 200 }}
          />
          <Button icon={<DeleteOutlined />} danger onClick={() => onDelete(property)} />
        </Space>

        {/* Type-specific configurations */}
        {config.type === 'string' && (
          <Space wrap>
            <Input
              placeholder="Default"
              value={config.default !== undefined ? String(config.default) : ''}
              onChange={(e) => updateConfig({ default: e.target.value || null })}
              style={{ width: 120 }}
            />
            <Select
              placeholder="Format"
              value={config.format || ''}
              onChange={(format) => updateConfig({ format: format || null })}
              style={{ width: 120 }}
            >
              <Option value="date">Date</Option>
              <Option value="date-time">DateTime</Option>
              <Option value="time">Time</Option>
              <Option value="email">Email</Option>
              <Option value="uri">URI</Option>
              <Option value="uuid">UUID</Option>
            </Select>
            <InputNumber
              placeholder="Min Length"
              value={config.minLength}
              onChange={(value) => updateConfig({ minLength: value || undefined })}
              style={{ width: 100 }}
              min={0}
            />
            <InputNumber
              placeholder="Max Length"
              value={config.maxLength}
              onChange={(value) => updateConfig({ maxLength: value || undefined })}
              style={{ width: 100 }}
              min={0}
            />
            <Input
              placeholder="Pattern"
              value={config.pattern || ''}
              onChange={(e) => updateConfig({ pattern: e.target.value || null })}
              style={{ width: 150 }}
            />
          </Space>
        )}

        {(config.type === 'number' || config.type === 'integer') && (
          <Space wrap>
            <InputNumber
              placeholder="Default"
              value={config.default}
              onChange={(value) => updateConfig({ default: value || null })}
              style={{ width: 120 }}
            />
            <InputNumber
              placeholder="Minimum"
              value={config.minimum}
              onChange={(value) => updateConfig({ minimum: value || undefined })}
              style={{ width: 100 }}
            />
            <InputNumber
              placeholder="Maximum"
              value={config.maximum}
              onChange={(value) => updateConfig({ maximum: value || undefined })}
              style={{ width: 100 }}
            />
          </Space>
        )}

        {config.type === 'boolean' && (
          <Space>
            <Select
              placeholder="Default"
              value={config.default === true ? 'true' : config.default === false ? 'false' : ''}
              onChange={(value) => {
                if (value === 'true') updateConfig({ default: true });
                else if (value === 'false') updateConfig({ default: false });
                else updateConfig({ default: null });
              }}
              style={{ width: 120 }}
            >
              <Option value="true">True</Option>
              <Option value="false">False</Option>
            </Select>
          </Space>
        )}

        {config.type === 'array' && (
          <Space wrap>
            <Select
              placeholder="Items Type"
              value={config.items?.type}
              onChange={(type) => {
                updateConfig({ items: type ? { type: type as PropertyConfig['type'] } : null });
              }}
              style={{ width: 120 }}
            >
              <Option value="string">String</Option>
              <Option value="number">Number</Option>
              <Option value="integer">Integer</Option>
              <Option value="boolean">Boolean</Option>
              <Option value="object">Object</Option>
            </Select>
            <InputNumber
              placeholder="Min Items"
              value={config.minItems}
              onChange={(value) => updateConfig({ minItems: value || undefined })}
              style={{ width: 100 }}
              min={0}
            />
            <InputNumber
              placeholder="Max Items"
              value={config.maxItems}
              onChange={(value) => updateConfig({ maxItems: value || undefined })}
              style={{ width: 100 }}
              min={0}
            />
            <Switch
              checked={config.uniqueItems || false}
              onChange={(uniqueItems) => updateConfig({ uniqueItems })}
              checkedChildren="Unique Items"
            />
          </Space>
        )}

        {config.type === 'object' && (
          <Space wrap>
            <Switch
              checked={config.additionalProperties === true || false}
              onChange={(additionalProperties) => {
                updateConfig({
                  additionalProperties,
                  ...(additionalProperties ? {} : { additionalProperties: false })
                });
              }}
              checkedChildren="Additional Properties"
            />
          </Space>
        )}

        <Space wrap>
          <Switch
            checked={config.required || false}
            onChange={(required) => updateConfig({ required })}
            checkedChildren="Required"
          />
          <Switch
            checked={config.readOnly || false}
            onChange={(readOnly) => updateConfig({ readOnly })}
            checkedChildren="Read Only"
          />
        </Space>
      </Space>
    </Card>
  );
};

// Object 属性编辑器
const ObjectPropertyEditor: React.FC<{
  properties: Record<string, PropertyConfig>;
  onChange: (properties: Record<string, PropertyConfig>) => void;
  required: string[];
  onRequiredChange: (required: string[]) => void;
}> = ({ properties, onChange, required, onRequiredChange }) => {
  const [newPropertyName, setNewPropertyName] = useState('');

  const handleAddProperty = () => {
    if (!newPropertyName) return;

    onChange({
      ...properties,
      [newPropertyName]: {
        type: 'string',
        title: newPropertyName,
        description: ''
      }
    });
    setNewPropertyName('');
  };

  const handleDeleteProperty = (property: string) => {
    const newProperties = { ...properties };
    delete newProperties[property];
    onChange(newProperties);
    onRequiredChange(required.filter(p => p !== property));
  };

  const handleUpdateProperty = (property: string, config: PropertyConfig) => {
    onChange({
      ...properties,
      [property]: config
    });
  };

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Input
            placeholder="Property name"
            value={newPropertyName}
            onChange={(e) => setNewPropertyName(e.target.value)}
            onPressEnter={handleAddProperty}
          />
          <Button icon={<PlusOutlined />} onClick={handleAddProperty}>
            Add Property
          </Button>
        </Space>

        <Collapse ghost defaultActiveKey={Object.keys(properties)}>
          {Object.entries(properties).map(([property, config]) => (
            <Panel
              header={
                <Space>
                  <strong>{property}</strong>
                  <Tag color={config.type === 'string' ? 'blue' :
                        config.type === 'number' ? 'green' :
                        config.type === 'boolean' ? 'orange' :
                        config.type === 'array' ? 'purple' : 'geekblue'}>
                    {config.type}
                  </Tag>
                  {required.includes(property) && <Tag color="red">Required</Tag>}
                </Space>
              }
              key={property}
            >
              <InlinePropertyEditor
                property={property}
                config={config}
                onChange={handleUpdateProperty}
                onDelete={handleDeleteProperty}
              />
            </Panel>
          ))}
        </Collapse>
      </Space>
    </div>
  );
};

export default function JSONSchemaEditor({ value, onChange }: JSONSchemaEditorProps) {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [jsonError, setJsonError] = useState<string>('');
  const [schemaData, setSchemaData] = useState<any>(value || {
    type: 'object',
    properties: {},
    required: []
  });

  const handleVisualChange = useCallback((newData: any) => {
    setSchemaData(newData);
    onChange?.(newData);
  }, [onChange]);

  const handleCodeChange = (jsonString: string) => {
    try {
      const parsed = jsonParse(jsonString);
      setSchemaData(parsed);
      onChange?.(parsed);
      setJsonError('');
    } catch (error: any) {
      setJsonError(error.message || 'Invalid JSON');
    }
  };

  const addCommonProperty = (type: string, preset?: any) => {
    const propName = `new${type.charAt(0).toUpperCase() + type.slice(1)}${Object.keys(schemaData.properties || {}).length + 1}`;
    const newProperty: PropertyConfig = {
      type: type as PropertyConfig['type'],
      title: propName,
      description: `A ${type} property`,
      ...(preset || {})
    };

    handleVisualChange({
      ...schemaData,
      properties: {
        ...schemaData.properties,
        [propName]: newProperty
      }
    });
  };

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Button.Group>
            <Button
              icon={<FunctionOutlined />}
              onClick={() => addCommonProperty('string')}
            >
              Add String
            </Button>
            <Button
              icon={<AppstoreOutlined />}
              onClick={() => addCommonProperty('number')}
            >
              Add Number
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => addCommonProperty('boolean')}
            >
              Add Boolean
            </Button>
            <Button
              icon={<AppstoreOutlined />}
              onClick={() => addCommonProperty('array')}
            >
              Add Array
            </Button>
          </Button.Group>

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
          message="Schema Editor"
          description="Visual editor allows you to build JSON Schema with a user-friendly interface. Switch to JSON Code for advanced editing."
          type="info"
          showIcon
          icon={<QuestionCircleOutlined />}
        />

        {activeTab === 'visual' ? (
          <div>
            <Divider />
            <ObjectPropertyEditor
              properties={schemaData.properties || {}}
              onChange={(properties) => handleVisualChange({ ...schemaData, properties })}
              required={schemaData.required || []}
              onRequiredChange={(required) => handleVisualChange({ ...schemaData, required })}
            />
          </div>
        ) : (
          <div>
            <TextArea
              value={JSON.stringify(schemaData, null, 2)}
              onChange={(e) => handleCodeChange(e.target.value)}
              rows={20}
              placeholder="Paste or edit JSON Schema here..."
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
}