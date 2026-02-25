import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Col, Row, Space, Alert, Typography } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import { CodeEditor } from '@/components/MonacoDynamic';
import SchemaRenderer from '@/components/formily/SchemaRenderer';
import { fetchFormilySchema, loadDraft, saveDraft, clearDraft, saveFormilySchema } from '@/services/schema';
import { validateFormilySchema } from '@/services/schema/validateSchema';
import { trackSchemaEvent } from '@/services/schema/telemetry';

const { Text } = Typography;

export default function SchemaDesigner() {
  const { message } = App.useApp();
  const params = useParams<{ id: string }>();
  const functionId = params.id || '';
  const [raw, setRaw] = useState<string>('{}');
  const [schema, setSchema] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState<string | undefined>(undefined);
  const [dirty, setDirty] = useState(false);

  const applyRaw = useCallback(
    (nextRaw?: string) => {
      const target = typeof nextRaw === 'string' ? nextRaw : raw;
      try {
        const parsed = JSON.parse(target);
        const validation = validateFormilySchema(parsed);
        if (!validation.ok) {
          setParseError(validation.error);
          return;
        }
        setSchema(parsed);
        setParseError(undefined);
      } catch (err: any) {
        setParseError(err?.message || 'JSON 解析失败');
      }
    },
    [raw],
  );

  const load = useCallback(async () => {
    if (!functionId) return;
    setLoading(true);
    try {
      const doc = await fetchFormilySchema(functionId);
      const draft = loadDraft(functionId);
      const initial = (draft?.schema || doc?.schema || { type: 'object', properties: {} }) as any;
      const text = JSON.stringify(initial, null, 2);
      setRaw(text);
      setSchema(initial);
      setParseError(undefined);
      setDirty(false);
      trackSchemaEvent('schema_load', { functionId, source: draft ? 'draft' : 'published' });
    } catch (e: any) {
      message.error(e?.message || '加载 schema 失败');
      trackSchemaEvent('schema_load_error', { functionId, error: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  }, [functionId, message]);

  useEffect(() => {
    load();
  }, [load]);

  const title = useMemo(() => `函数 UI 设计器：${functionId || '-'}`, [functionId]);

  return (
    <PageContainer
      title={title}
      extra={[
        <Button key="back" onClick={() => history.push(`/game/functions/${encodeURIComponent(functionId)}?tab=config&subTab=ui`)}>
          返回预览
        </Button>,
        <Button
          key="draft"
          onClick={() => {
            try {
              const parsed = JSON.parse(raw);
              saveDraft(functionId, parsed);
              message.success('草稿已保存');
              trackSchemaEvent('schema_draft_save', { functionId });
            } catch (e: any) {
              message.error(e?.message || '草稿保存失败');
            }
          }}
          disabled={!dirty}
        >
          保存草稿
        </Button>,
        <Button
          key="clear-draft"
          onClick={() => {
            clearDraft(functionId);
            message.success('草稿已清除');
            trackSchemaEvent('schema_draft_clear', { functionId });
          }}
        >
          清除草稿
        </Button>,
        <Button
          key="publish"
          type="primary"
          loading={saving}
          onClick={async () => {
            try {
              setSaving(true);
              const parsed = JSON.parse(raw);
              const validation = validateFormilySchema(parsed);
              if (!validation.ok) {
                message.error(validation.error);
                return;
              }
              await saveFormilySchema(functionId, parsed);
              setDirty(false);
              message.success('已发布');
              trackSchemaEvent('schema_publish', { functionId });
            } catch (e: any) {
              message.error(e?.message || '发布失败');
              trackSchemaEvent('schema_publish_error', { functionId, error: e?.message || String(e) });
            } finally {
              setSaving(false);
            }
          }}
          disabled={!dirty}
        >
          发布
        </Button>,
      ]}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Card
            title="Formily JSON Schema"
            loading={loading}
            extra={
              <Space>
                <Button onClick={() => applyRaw()}>应用预览</Button>
                <Button onClick={load}>重载</Button>
              </Space>
            }
          >
            <CodeEditor
              value={raw}
              language="json"
              height={520}
              onChange={(v) => {
                setRaw(v || '');
                setDirty(true);
              }}
            />
            {parseError && (
              <Alert style={{ marginTop: 12 }} type="error" showIcon message="Schema 校验失败" description={parseError} />
            )}
            {!parseError && dirty && (
              <Text type="secondary">提示：修改后点击“应用预览”查看效果。</Text>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="预览" loading={loading}>
            <SchemaRenderer schema={schema} readOnly={false} />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
