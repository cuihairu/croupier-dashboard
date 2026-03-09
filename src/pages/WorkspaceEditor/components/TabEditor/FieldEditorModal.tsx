import React from 'react';
import { Modal, Form, Input, Select, Switch } from 'antd';
import type { FieldConfig } from '@/types/workspace';

export interface FieldEditorModalProps {
  open: boolean;
  editingField: FieldConfig | null;
  onOk: (values: FieldConfig) => void;
  onCancel: () => void;
}

export default function FieldEditorModal({
  open,
  editingField,
  onOk,
  onCancel,
}: FieldEditorModalProps) {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (open && editingField) {
      form.setFieldsValue(editingField);
    } else if (open) {
      form.resetFields();
    }
  }, [open, editingField, form]);

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
      title={editingField ? '编辑字段' : '添加字段'}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="key" label="字段名" rules={[{ required: true }]}>
          <Input placeholder="如: playerId" />
        </Form.Item>
        <Form.Item name="label" label="字段标签" rules={[{ required: true }]}>
          <Input placeholder="如: 玩家ID" />
        </Form.Item>
        <Form.Item name="type" label="字段类型" rules={[{ required: true }]}>
          <Select>
            {['input', 'number', 'select', 'date', 'datetime', 'textarea', 'switch'].map((t) => (
              <Select.Option key={t} value={t}>
                {t}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="required" label="必填" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="placeholder" label="占位符">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
