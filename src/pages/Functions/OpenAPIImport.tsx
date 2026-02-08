import React, { useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Form, Input, Button, Alert, message, Space, Typography } from 'antd';
import { ImportOutlined } from '@ant-design/icons';
import { importOpenAPISpec } from '@/services/api';
import ReactJson from '@microlink/react-json-view';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const OpenAPIImport: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const specPlaceholder = `{
  "openapi": "3.0.3",
  "info": {
    "title": "My API",
    "version": "1.0.0"
  },
  "paths": {
    "/myFunction": {
      "post": {
        "operationId": "myFunction",
        "summary": "My Function",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success"
          }
        }
      }
    }
  }
}`;

  const handleSubmit = async (values: any) => {
    let spec;
    try {
      spec = JSON.parse(values.spec);
    } catch (err: any) {
      message.error('Invalid JSON format');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await importOpenAPISpec(spec);
      setResult(response);

      if (response.imported > 0) {
        message.success(`Successfully imported ${response.imported} function(s)`);
      }

      if (response.failed && response.failed.length > 0) {
        message.warning(`Imported ${response.imported} function(s), but ${response.failed.length} failed`);
      }

      if (response.imported === 0) {
        message.warning('No functions were imported');
      }
    } catch (err: any) {
      console.error('Failed to import OpenAPI spec:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to import OpenAPI spec');
      message.error('Failed to import OpenAPI spec');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Import OpenAPI Specification"
      content={
        <div style={{ padding: 24, maxWidth: 1200 }}>
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={4}>Import OpenAPI 3.0.3 Specification</Title>
                <Paragraph>
                  Import functions from an OpenAPI 3.0.3 specification. The spec should contain
                  path definitions with operations that will be registered as functions.
                </Paragraph>
              </div>

              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                style={{ width: '100%' }}
              >
                <Form.Item
                  label="OpenAPI Specification (JSON)"
                  name="spec"
                  rules={[{ required: true, message: 'Please input OpenAPI spec' }]}
                >
                  <TextArea
                    rows={20}
                    placeholder={specPlaceholder}
                    style={{ fontFamily: 'monospace' }}
                  />
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      icon={<ImportOutlined />}
                    >
                      Import Functions
                    </Button>
                    <Button onClick={() => form.resetFields()}>Reset</Button>
                  </Space>
                </Form.Item>
              </Form>

              {error && (
                <Alert
                  type="error"
                  message={error}
                  showIcon
                  closable
                  style={{ marginTop: 16 }}
                />
              )}

              {result && (
                <Alert
                  type={result.imported > 0 ? 'success' : 'warning'}
                  message={
                    <div>
                      <div>Import completed</div>
                      <div style={{ marginTop: 8 }}>
                        <Text strong>Imported: </Text>
                        <Text style={{ marginLeft: 8 }}>{result.imported} functions</Text>
                      </div>
                      {result.failed.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <Text strong>Failed: </Text>
                          <Text style={{ marginLeft: 8 }}>{result.failed.length} functions</Text>
                        </div>
                      )}
                    </div>
                  }
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </Space>
          </Card>

          <Card title="Specification Format Reference" style={{ marginTop: 24 }}>
            <Paragraph>
              <Text code>
                {`{
  "openapi": "3.0.3",
  "info": { "title": "...", "version": "..." },
  "paths": {
    "/functions/{id}": {
      "post": {
        "operationId": "function.id",
        "summary": "Function summary",
        "x-category": "category",
        "x-risk": "low|medium|high",
        "x-entity": "entity_name",
        "x-operation": "create|read|update|delete|custom",
        ...
      }
    }
  }
}`}
              </Text>
            </Paragraph>
            <Paragraph>
              Each path item will be registered as a separate function. The{' '}
              <Text code>operationId</Text> will be used as the function ID. Extension fields
              like <Text code>x-category</Text>, <Text code>x-risk</Text>, <Text code>x-entity</Text>,
              and <Text code>x-operation</Text> are optional but recommended for better organization.
            </Paragraph>
          </Card>
        </div>
      }
    />
  );
};

export default OpenAPIImport;
