import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Space, Tag, Select, Input, Button, App, Drawer, Typography, Descriptions } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import type { ColumnsType } from 'antd/es/table';
import { fetchOpsServices, updateAgentMeta, type OpsService, type AgentProcess } from '@/services/api/ops';

export default function OpsServicesPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<OpsService[]>([]);
  const [filter, setFilter] = useState<{ game?: string; env?: string; healthy?: string; q?: string }>({});
  const [qValue, setQValue] = useState<string>('');
  const [detail, setDetail] = useState<OpsService | null>(null);
  const [processes, setProcesses] = useState<AgentProcess[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchOpsServices();
      setRows(res.services || []);
    } catch (e: any) { message.error(e?.message || '加载失败'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // sync with global scope
  useEffect(() => {
    const onStorage = () => setFilter((f)=>({ ...f, game: localStorage.getItem('game_id')||undefined, env: localStorage.getItem('env')||undefined }));
    onStorage();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const data = useMemo(() => {
    return (rows||[]).filter((r) => {
      if (filter.game && r.gameId && r.gameId !== filter.game) return false;
      if (filter.env && r.env && r.env !== filter.env) return false;
      if (filter.healthy) {
        const isHealthy = r.status === 'healthy' || r.status === 'running';
        if (filter.healthy === 'healthy' && !isHealthy) return false;
        if (filter.healthy === 'unhealthy' && isHealthy) return false;
      }
      if (filter.q) {
        const q = filter.q.toLowerCase();
        const s = `${r.id} ${r.name} ${r.address||''} ${r.type||''} ${r.version||''} ${r.region||''} ${r.zone||''}`.toLowerCase();
        if (!s.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filter]);

  const columns: ColumnsType<OpsService> = [
    { title: 'Service ID', dataIndex: 'id', width: 180, ellipsis: true },
    { title: 'Name', dataIndex: 'name', width: 150, ellipsis: true },
    { title: 'Type', dataIndex: 'type', width: 90, render: (v) => v || 'agent' },
    { title: 'Status', dataIndex: 'status', width: 90, render: (v) => {
      const color = v === 'healthy' ? 'green' : v === 'running' ? 'blue' : 'red';
      return <Tag color={color}>{v}</Tag>;
    }},
    { title: 'Address', dataIndex: 'address', width: 200, ellipsis: true },
    { title: 'Game', dataIndex: 'gameId', width: 100 },
    { title: 'Env', dataIndex: 'env', width: 80 },
    { title: 'Region', dataIndex: 'region', width: 100, ellipsis: true },
    { title: 'Zone', dataIndex: 'zone', width: 80 },
    { title: 'Version', dataIndex: 'version', width: 100, ellipsis: true },
    { title: 'Functions', dataIndex: 'functionsCount', width: 80, render: (v) => v || 0 },
    { title: 'Processes', width: 90, render: (_: any, r) => (r?.metadata?.processesCount ?? r?.metadata?.processes?.length ?? 0) },
    { title: 'Last Seen', dataIndex: 'lastSeen', width: 160, render: (v) => v ? new Date(v).toLocaleString() : '-' },
  ];

  return (
    <PageContainer>
      <Card title="服务列表" extra={
        <Space>
          <Select
            style={{ width: 140 }}
            placeholder="健康状态"
            allowClear
            value={filter.healthy as any}
            onChange={(v)=>setFilter((f)=>({ ...f, healthy: v }))}
            options={[{label:'healthy', value:'healthy'}, {label:'unhealthy', value:'unhealthy'}]}
          />
          <Space.Compact style={{ width: 360 }}>
            <Input
              allowClear
              placeholder="按 id/ip/type/version 搜索"
              value={qValue}
              onChange={(e)=> setQValue(e.target.value)}
              onPressEnter={()=> setFilter((f)=> ({ ...f, q: (qValue||'').trim() || undefined }))}
            />
            <Button type="primary" onClick={()=> setFilter((f)=> ({ ...f, q: (qValue||'').trim() || undefined }))}>搜索</Button>
          </Space.Compact>
          <Button onClick={load}>刷新</Button>
        </Space>
      }>
        <Table<OpsService>
          rowKey={(r)=>r.id}
          dataSource={data}
          loading={loading}
          columns={columns}
          size='small'
          scroll={{ x: 1200 }}
          tableLayout='fixed'
          onRow={(rec)=> ({ onClick: ()=> { setDetail(rec); setProcesses((rec?.metadata?.processes || []) as any); } })}
          pagination={{ pageSize: 10 }}
        />
      </Card>
      <Drawer title="实例详情" width={720} open={!!detail} onClose={()=> setDetail(null)} extra={<Space>
        <Button onClick={load}>刷新</Button>
        {detail && detail.type === 'agent' && <Button onClick={async ()=>{
          const region = prompt('Region（可选）', detail.region||'')||'';
          const zone = prompt('Zone（可选）', detail.zone||'')||'';
          try { await updateAgentMeta(detail.id, { region, zone }); message.success('已更新'); load(); }
          catch(e:any){ message.error(e?.message||'更新失败'); }
        }}>编辑元信息</Button>}
      </Space>}>
        {detail && (
          <Space direction="vertical" size="middle" style={{ width:'100%' }}>
            <Card title="基础信息" size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Service ID">{detail.id}</Descriptions.Item>
                <Descriptions.Item label="Name">{detail.name}</Descriptions.Item>
                <Descriptions.Item label="Type">{detail.type}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={detail.status === 'healthy' ? 'green' : detail.status === 'running' ? 'blue' : 'red'}>{detail.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Address" span={2}>{detail.address || '-'}</Descriptions.Item>
                <Descriptions.Item label="Game">{detail.gameId || '-'}</Descriptions.Item>
                <Descriptions.Item label="Env">{detail.env || '-'}</Descriptions.Item>
                <Descriptions.Item label="Region">{detail.region || '-'}</Descriptions.Item>
                <Descriptions.Item label="Zone">{detail.zone || '-'}</Descriptions.Item>
                <Descriptions.Item label="Version">{detail.version || '-'}</Descriptions.Item>
                <Descriptions.Item label="Functions">{detail.functionsCount || 0}</Descriptions.Item>
                <Descriptions.Item label="最后活跃">{detail.lastSeen ? new Date(detail.lastSeen).toLocaleString() : '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            {processes.length > 0 && (
              <Card title={`注册进程 (${processes.length})`} size="small">
                <Table<AgentProcess>
                  size="small"
                  rowKey={(r) => r.service_id}
                  dataSource={processes}
                  pagination={false}
                  columns={[
                    { title: 'service_id', dataIndex: 'service_id', width: 200, ellipsis: true },
                    { title: 'addr', dataIndex: 'addr', width: 180, ellipsis: true },
                    { title: 'version', dataIndex: 'version', width: 100, ellipsis: true, render: (v) => v || '-' },
                    { title: 'functions', dataIndex: 'functions', width: 90, render: (v: any, r: any) => v ?? (r?.function_ids?.length || 0) },
                    { title: 'last_seen', dataIndex: 'last_seen_unix', width: 150, render: (v) => v ? new Date(Number(v) * 1000).toLocaleString() : '-' },
                  ]}
                  expandable={{
                    expandedRowRender: (r) => (
                      <Typography.Text type="secondary">
                        {(r?.function_ids || []).join(', ') || '-'}
                      </Typography.Text>
                    ),
                    rowExpandable: (r) => Array.isArray(r?.function_ids) && r.function_ids.length > 0,
                  }}
                />
              </Card>
            )}

            <Card title="Labels" size="small">
              {detail.labels ? (
                <Space wrap>
                  {Object.entries(detail.labels).map(([key, value], index) => {
                    const colors = ['blue', 'green', 'orange', 'purple', 'cyan', 'magenta', 'gold', 'lime', 'red', 'volcano', 'geekblue', 'pink'];
                    return (
                      <Tag key={key} color={colors[index % colors.length]}>{key}: {value}</Tag>
                    );
                  })}
                </Space>
              ) : '-'}
            </Card>
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
}
