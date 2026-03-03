import React from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import { AppstoreOutlined, CodeOutlined, FileTextOutlined, InboxOutlined } from '@ant-design/icons';

type PacksStats = {
  totalPacks: number;
  activePacks: number;
  canaryPacks: number;
  totalFunctions: number;
  totalEntities: number;
};

export default function StatsRow({
  stats,
  uiSchemaCount,
}: {
  stats: PacksStats;
  uiSchemaCount: number;
}) {
  return (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col span={4}>
        <Card>
          <Statistic title="总包数" value={stats.totalPacks} prefix={<AppstoreOutlined />} />
        </Card>
      </Col>
      <Col span={4}>
        <Card>
          <Statistic title="活跃包" value={stats.activePacks} valueStyle={{ color: '#3f8600' }} />
        </Card>
      </Col>
      <Col span={4}>
        <Card>
          <Statistic title="灰度包" value={stats.canaryPacks} valueStyle={{ color: '#fa8c16' }} />
        </Card>
      </Col>
      <Col span={4}>
        <Card>
          <Statistic title="总函数" value={stats.totalFunctions} prefix={<CodeOutlined />} />
        </Card>
      </Col>
      <Col span={4}>
        <Card>
          <Statistic title="总实体" value={stats.totalEntities} prefix={<InboxOutlined />} />
        </Card>
      </Col>
      <Col span={4}>
        <Card>
          <Statistic title="UI Schema" value={uiSchemaCount} prefix={<FileTextOutlined />} />
        </Card>
      </Col>
    </Row>
  );
}
