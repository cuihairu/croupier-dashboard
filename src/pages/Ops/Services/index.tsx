import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Space, Tag, Select, Input, Button, App, Drawer } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import type { ColumnsType } from 'antd/es/table';
import GameSelector from '@/components/GameSelector';
import { fetchOpsServices, updateAgentMeta, type OpsService } from '@/services/croupier/ops';

export default function OpsServicesPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<OpsService[]>([]);
  const [filter, setFilter] = useState<{ game?: string; env?: string; healthy?: string; q?: string }>({});
  const [qValue, setQValue] = useState<string>('');
  const [detail, setDetail] = useState<OpsService | null>(null);

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
    { title: 'Last Seen', dataIndex: 'lastSeen', width: 160, render: (v) => v ? new Date(v).toLocaleString() : '-' },
  ];

  return (
    <PageContainer>
      <Card title="服务列表" extra={
        <Space>
          <GameSelector />
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
          onRow={(rec)=> ({ onClick: ()=> setDetail(rec) })}
          pagination={{ pageSize: 10 }}
        />
      </Card>
      <Drawer title="实例详情" width={640} open={!!detail} onClose={()=> setDetail(null)} extra={<Space>
        <Button onClick={load}>刷新</Button>
        {detail && detail.type === 'agent' && <Button onClick={async ()=>{
          const region = prompt('Region（可选）', detail.region||'')||'';
          const zone = prompt('Zone（可选）', detail.zone||'')||'';
          try { await updateAgentMeta(detail.id, { region, zone }); message.success('已更新'); load(); }
          catch(e:any){ message.error(e?.message||'更新失败'); }
        }}>编辑元信息</Button>}
      </Space>}>
        {detail && (
          <Space direction="vertical" style={{ width:'100%' }}>
            <div><b>Service ID:</b> {detail.id}</div>
            <div><b>Name:</b> {detail.name}</div>
            <div><b>Type:</b> {detail.type}</div>
            <div><b>Status:</b> <Tag color={detail.status === 'healthy' ? 'green' : detail.status === 'running' ? 'blue' : 'red'}>{detail.status}</Tag></div>
            <div><b>Address:</b> {detail.address || '-'}</div>
            <div><b>Game/Env:</b> {detail.gameId || '-'} / {detail.env || '-'}</div>
            <div><b>Region/Zone:</b> {detail.region || '-'} / {detail.zone || '-'}</div>
            <div><b>Version:</b> {detail.version || '-'}</div>
            <div><b>Functions:</b> {detail.functionsCount || 0}</div>
            <div><b>Labels:</b> {detail.labels ? JSON.stringify(detail.labels) : '-'}</div>
            <div><b>最后活跃:</b> {detail.lastSeen ? new Date(detail.lastSeen).toLocaleString() : '-'}</div>
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
}
