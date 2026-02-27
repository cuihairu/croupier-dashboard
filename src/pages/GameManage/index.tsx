import React, { useEffect, useState } from 'react';
import { Card, Table, Form, Input, Button, Space, AutoComplete, Modal, Popconfirm, Tag } from 'antd';
import { listGamesMeta, upsertGame, deleteGame, type Game } from '@/services/api';
import GameSelector from '@/components/GameSelector';

export default function GameManagePage() {
  const [data, setData] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await listGamesMeta();
      setData(res.games || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const onAdd = async () => {
    try {
      const v = await form.validateFields();
      setSubmitting(true);
      await upsertGame({
        name: String(v.game_id || '').trim(),
        alias_name: String(v.alias_name || '').trim() || undefined,
        description: String(v.description || '').trim() || undefined,
      });
      form.resetFields();
      reload();
    } catch (_) {
      // handled by global request interceptor
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="Game Management" extra={<GameSelector />}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Form form={form} layout="inline">
          <Form.Item name="game_id" label="game_id" rules={[{ required: true }]}>
            {/* Dropdown suggestions + free input */}
            <AutoComplete
              style={{ width: 240 }}
              placeholder="e.g. default | mygame"
              options={[...new Set((data || []).map((d) => d.name).filter(Boolean))].map((g) => ({ value: g! }))}
              filterOption={(inputValue, option) => (option?.value || '').toLowerCase().includes(inputValue.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="alias_name" label="alias">
            <Input style={{ width: 180 }} placeholder="显示名（可选）" />
          </Form.Item>
          <Form.Item name="description" label="desc">
            <Input style={{ width: 260 }} placeholder="描述（可选）" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={onAdd} loading={submitting}>Add</Button>
          </Form.Item>
        </Form>
        <Table
          rowKey={(r) => String(r.id || r.name)}
          loading={loading}
          dataSource={data}
          pagination={false}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 80 },
            { title: 'game_id', dataIndex: 'name', render: (v: string) => <Tag color="blue">{v}</Tag> },
            { title: 'alias', dataIndex: 'alias_name' },
            { title: 'description', dataIndex: 'description' },
            {
              title: 'actions',
              width: 120,
              render: (_, row) => (
                <Popconfirm
                  title={`Delete game "${row.name}"?`}
                  onConfirm={async () => {
                    if (!row.id) {
                      Modal.warning({ title: '无法删除', content: '该游戏缺少 ID，无法调用删除接口。' });
                      return;
                    }
                    await deleteGame(row.id);
                    await reload();
                  }}
                >
                  <Button danger size="small">Delete</Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Space>
    </Card>
  );
}
