import React, { useEffect, useState } from 'react';
import { Card, Space, DatePicker, Input, Select, Button, Table, Tag } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import { exportToXLSX } from '@/utils/export';
import { fetchAnalyticsAttribution } from '@/services/croupier/analytics';

export default function AnalyticsAttributionPage() {
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<any>(null);
  const [channel, setChannel] = useState<string>('');
  const [campaign, setCampaign] = useState<string>('');
  const [data, setData] = useState<any>({ summary: {}, by_channel: [], by_campaign: [] });
  const [availableChannels, setAvailableChannels] = useState<{label: string; value: string}[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (range && range[0]) params.start = range[0].toISOString();
      if (range && range[1]) params.end = range[1].toISOString();
      if (channel) params.channel = channel;
      if (campaign) params.campaign = campaign;
      const r = await fetchAnalyticsAttribution(params);
      setData(r||{ summary: {}, by_channel: [], by_campaign: [] });

      // Extract unique channels from the response
      if (r?.by_channel) {
        const channels = r.by_channel
          .filter((item: any) => item.channel)
          .map((item: any) => ({
            label: item.channel,
            value: item.channel,
          }));
        // Remove duplicates
        const uniqueChannels = channels.filter((channel: any, index: number, self: any[]) =>
          index === self.findIndex((c: any) => c.value === channel.value)
        );
        setAvailableChannels(uniqueChannels);
      }
    } finally { setLoading(false); }
  };
  useEffect(()=>{ /* not auto-load */ }, []);

  return (
    <PageContainer>
      <Card title="渠道投放" extra={<Space>
        <DatePicker.RangePicker value={range as any} onChange={setRange as any} />
        <Select
          allowClear
          showSearch
          placeholder="渠道"
          value={channel}
          onChange={setChannel}
          style={{ width: 160 }}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={availableChannels}
          notFoundContent="请输入渠道名称"
        />
        <Input placeholder="活动/Campaign" value={campaign} onChange={(e)=> setCampaign(e.target.value)} style={{ width: 200 }} />
        <Button type="primary" onClick={load}>查询</Button>
      </Space>}>
        <Space size={16} wrap>
          <Tag color="blue">安装: {data?.summary?.installs||0}</Tag>
          <Tag>注册: {data?.summary?.signups||0}</Tag>
          <Tag>首登: {data?.summary?.first_active||0}</Tag>
          <Tag color="gold">CPI(分): {data?.summary?.cpi_cents||0}</Tag>
          <Tag color="green">ROAS D1/D7/D30: {[data?.summary?.roas_d1||0, data?.summary?.roas_d7||0, data?.summary?.roas_d30||0].join('/')}</Tag>
          <Tag color="purple">回本天数: {data?.summary?.payback_days||'-'}</Tag>
        </Space>
        <Table style={{ marginTop: 12 }} size="small" loading={loading}
          rowKey={(r:any)=> String(r.channel ?? r.campaign ?? '')}
          dataSource={data?.by_channel||[]}
          columns={[{title:'渠道',dataIndex:'channel'},{title:'安装',dataIndex:'installs'},{title:'注册',dataIndex:'signups'},{title:'首日付费额(分)',dataIndex:'rev_d0_cents'},{title:'CPI(分)',dataIndex:'cpi_cents'},{title:'ROAS D1/D7/D30',render:(_:any,r:any)=> `${r.roas_d1||0}/${r.roas_d7||0}/${r.roas_d30||0}`}]}
          pagination={{ pageSize: 10 }}
        />
        <div style={{ marginTop: 8 }}>
          <Button onClick={async ()=>{
            const rows = [['channel','installs','signups','rev_d0_cents','cpi_cents','roas_d1','roas_d7','roas_d30']].concat((data?.by_channel||[]).map((r:any)=>[r.channel,r.installs,r.signups,r.rev_d0_cents,r.cpi_cents,r.roas_d1,r.roas_d7,r.roas_d30]));
            await exportToXLSX('attribution.csv', [{ sheet:'by_channel', rows }]);
          }}>导出 CSV</Button>
        </div>
      </Card>
    </PageContainer>
  );
}
