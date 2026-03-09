import React from 'react';
import { Form, Input, Switch, Card } from 'antd';
import type { TabConfig } from '@/types/workspace';
import IconPicker from '../IconPicker';

export interface TabBasicInfoProps {
  tab: TabConfig;
  onChange: (field: string, value: any) => void;
}

export default function TabBasicInfo({ tab, onChange }: TabBasicInfoProps) {
  return (
    <Card title="基本信息" size="small">
      <Form layout="vertical">
        <Form.Item label="标题">
          <Input
            value={tab.title}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="请输入标题"
          />
        </Form.Item>
        <Form.Item label="图标">
          <IconPicker value={tab.icon} onChange={(val) => onChange('icon', val)} />
        </Form.Item>
        <Form.Item label="设为默认页">
          <Switch
            checked={Boolean(tab.defaultActive)}
            onChange={(checked) => onChange('defaultActive', checked)}
          />
        </Form.Item>
      </Form>
    </Card>
  );
}
