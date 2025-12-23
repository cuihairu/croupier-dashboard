import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Input, Space, Typography } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import { LinkOutlined, ReloadOutlined } from '@ant-design/icons';
import { fetchOpsConfig } from '@/services/croupier/ops';

const { Text } = Typography;

type OpsConfig = { grafana_explore_url?: string; jaeger_url?: string };

function normalizeBaseUrl(url?: string) {
  return (url || '').trim().replace(/\/+$/, '');
}

export default function TracesPage() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<OpsConfig>({});
  const [traceId, setTraceId] = useState('');

  const jaegerTraceUrl = useMemo(() => {
    const base = normalizeBaseUrl(config.jaeger_url);
    const id = traceId.trim();
    if (!base || !id) return '';
    return `${base}/trace/${encodeURIComponent(id)}`;
  }, [config.jaeger_url, traceId]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetchOpsConfig();
      setConfig(res || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig().catch(() => {});
  }, []);

  const openGrafanaExplore = () => {
    if (!config.grafana_explore_url) return;
    window.open(config.grafana_explore_url, '_blank', 'noopener,noreferrer');
  };

  const openJaegerTrace = () => {
    if (!jaegerTraceUrl) return;
    window.open(jaegerTraceUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <PageContainer>
      <Card
        title="链路追踪"
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadConfig} loading={loading}>
            刷新配置
          </Button>
        }
      >
        <Alert
          type="info"
          showIcon
          message="当前版本不提供 Trace 列表/详情查询"
          description={
            <div>
              <div>请配置外部追踪系统并从这里跳转：</div>
              <div style={{ marginTop: 4 }}>
                <Text code>CROUPIER_GRAFANA_EXPLORE_URL</Text> / <Text code>CROUPIER_JAEGER_URL</Text>
              </div>
            </div>
          }
          style={{ marginBottom: 16 }}
        />

        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Space wrap>
            <Input
              placeholder="输入 Trace ID（用于跳转）"
              value={traceId}
              onChange={(e) => setTraceId(e.target.value)}
              style={{ width: 380 }}
            />
            <Button
              icon={<LinkOutlined />}
              onClick={openGrafanaExplore}
              disabled={!config.grafana_explore_url}
            >
              打开 Grafana Explore
            </Button>
            <Button
              icon={<LinkOutlined />}
              onClick={openJaegerTrace}
              disabled={!jaegerTraceUrl}
            >
              在 Jaeger 中打开
            </Button>
          </Space>

          <Empty description="请从 Job/调用日志中获取 trace_id，然后跳转到 Grafana/Jaeger 查看" />
        </Space>
      </Card>
    </PageContainer>
  );
}
