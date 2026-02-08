import React, { useEffect, useState } from 'react';
import { useParams } from '@umijs/max';
import { getFunctionOpenAPISpec } from '@/services/api';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Alert, Descriptions, Tag, Typography, Button } from 'antd';
import { FileTextOutlined, CopyOutlined } from '@ant-design/icons';
import ReactJson from '@microlink/react-json-view';

const { Paragraph, Text, Title, Paragraph: { Text: ParagraphText } } = Typography;

const FunctionOpenAPISpec: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [spec, setSpec] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSpec = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const response = await getFunctionOpenAPISpec(id);
      setSpec(response.spec);
    } catch (err: any) {
      console.error('Failed to load OpenAPI spec:', err);
      setError(err?.message || 'Failed to load OpenAPI spec');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpec();
  }, [id]);

  const handleCopy = () => {
    if (spec) {
      navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    }
  };

  const renderExtensions = () => {
    if (!spec?.extensions) return null;

    const extensions = spec.extensions;
    return (
      <Descriptions title="Extensions" bordered column={1} size="small">
        {Object.entries(extensions).map(([key, value]) => (
          <Descriptions.Item key={key} label={key}>
            {typeof value === 'string' ? (
              <Tag>{value}</Tag>
            ) : (
              <Text code>{JSON.stringify(value)}</Text>
            )}
          </Descriptions.Item>
        ))}
      </Descriptions>
    );
  };

  return (
    <PageContainer
      title="OpenAPI Specification"
      extra={
        <Button
          type="primary"
          icon={<CopyOutlined />}
          onClick={handleCopy}
          disabled={!spec}
        >
          Copy Spec
        </Button>
      }
      content={
        <div style={{ padding: 24 }}>
          <Card>
            {error && (
              <Alert
                type="error"
                message={error}
                showIcon
                closable
                style={{ marginBottom: 16 }}
              />
            )}
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
            ) : spec ? (
              <>
                <Descriptions title="Basic Info" bordered column={2} size="small">
                  <Descriptions.Item label="Operation ID">
                    <Text code>{spec.operationId || spec['operationId'] || '-'}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Summary">
                    {spec.summary || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Description" span={2}>
                    <Paragraph>{spec.description || 'No description'}</Paragraph>
                  </Descriptions.Item>
                  <Descriptions.Item label="Tags" span={2}>
                    {spec.tags?.map((tag: string) => (
                      <Tag key={tag} color="blue" style={{ marginRight: 4 }}>
                        {tag}
                      </Tag>
                    ))}
                  </Descriptions.Item>
                  <Descriptions.Item label="Deprecated">
                    {spec.deprecated ? (
                      <Tag color="red">Deprecated</Tag>
                    ) : (
                      <Tag color="green">Active</Tag>
                    )}
                  </Descriptions.Item>
                </Descriptions>

                {renderExtensions()}

                <Title level={5} style={{ marginTop: 24 }}>
                  <FileTextOutlined /> Request Schema
                </Title>
                {spec.requestBody?.content?.['application/json']?.schema && (
                  <div style={{ marginTop: 16 }}>
                    <ReactJson
                      src={spec.requestBody.content['application/json'].schema}
                      name="request_schema"
                      collapsed={2}
                      theme="monokai"
                      style={{ backgroundColor: '#1e1e1e', borderRadius: 4 }}
                    />
                  </div>
                )}

                <Title level={5} style={{ marginTop: 24 }}>
                  <FileTextOutlined /> Response Schema
                </Title>
                {spec.responses?.['200']?.content?.['application/json']?.schema && (
                  <div style={{ marginTop: 16 }}>
                    <ReactJson
                      src={spec.responses['200'].content['application/json'].schema}
                      name="response_schema"
                      collapsed={2}
                      theme="monokai"
                      style={{ backgroundColor: '#1e1e1e', borderRadius: 4 }}
                    />
                  </div>
                )}

                <Title level={5} style={{ marginTop: 24 }}>
                  <FileTextOutlined /> Full OpenAPI Spec (JSON)
                </Title>
                <div style={{ marginTop: 16 }}>
                  <ReactJson
                    src={spec}
                    name="openapi_spec"
                    collapsed={3}
                    theme="monokai"
                    style={{ backgroundColor: '#1e1e1e', borderRadius: 4 }}
                  />
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Text type="secondary">No OpenAPI spec available for this function</Text>
              </div>
            )}
          </Card>
        </div>
      }
    />
  );
};

export default FunctionOpenAPISpec;
