import React from 'react';
import { Modal, Form, Input, Select, Switch } from 'antd';
import type { ColumnConfig } from '@/types/workspace';

export interface ColumnEditorModalProps {
  open: boolean;
  editingColumn: ColumnConfig | null;
  onOk: (values: ColumnConfig) => void;
  onCancel: () => void;
}

export default function ColumnEditorModal({
  open,
  editingColumn,
  onOk,
  onCancel,
}: ColumnEditorModalProps) {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (open && editingColumn) {
      form.setFieldsValue(editingColumn);
    } else if (open) {
      form.resetFields();
    }
  }, [open, editingColumn, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onOk(values);
    form.resetFields();
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={editingColumn ? '编辑列' : '添加列'}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="key" label="字段名" rules={[{ required: true }]}>
          <Input placeholder="如: playerId" />
        </Form.Item>
        <Form.Item name="title" label="列标题" rules={[{ required: true }]}>
          <Input placeholder="如: 玩家ID" />
        </Form.Item>
        <Form.Item name="render" label="渲染方式">
          <Select allowClear placeholder="默认文本">
            {['text', 'status', 'datetime', 'date', 'tag', 'money', 'link', 'image'].map((r) => (
              <Select.Option key={r} value={r}>
                {r}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="width" label="列宽">
          <Input type="number" placeholder="如: 120" />
        </Form.Item>
        <Form.Item name="fixed" label="固定方向">
          <Select allowClear placeholder="不固定">
            <Select.Option value="left">左固定</Select.Option>
            <Select.Option value="right">右固定</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="align" label="对齐方式">
          <Select allowClear placeholder="默认左对齐">
            <Select.Option value="left">左对齐</Select.Option>
            <Select.Option value="center">居中</Select.Option>
            <Select.Option value="right">右对齐</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="ellipsis" label="超长省略" valuePropName="checked">
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>
        <Form.Item name="sortable" label="可排序" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
