/**
 * 表单布局渲染器
 *
 * 显示表单，用于数据提交。
 *
 * @module components/WorkspaceRenderer/renderers/FormRenderer
 */

import React, { useState } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  Radio,
  Checkbox,
  Button,
  Space,
  message,
} from 'antd';
import type { FormLayout } from '@/types/workspace';
import { invokeFunction } from '@/services/functionInvoke';

export interface FormRendererProps {
  /** 表单布局配置 */
  layout: FormLayout;

  /** 对象标识 */
  objectKey: string;

  /** 额外的上下文数据 */
  context?: Record<string, any>;
}

/**
 * 表单布局渲染器组件
 */
export default function FormRenderer({ layout, objectKey, context }: FormRendererProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 处理提交
  const handleSubmit = async (values: any) => {
    if (!layout.submitFunction) {
      message.error('未配置提交函数');
      return;
    }

    setLoading(true);
    try {
      // 使用函数调用服务
      await invokeFunction(layout.submitFunction, values);

      message.success('提交成功');

      // 重置表单
      if (layout.showReset !== false) {
        form.resetFields();
      }
    } catch (error: any) {
      message.error(error.message || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理重置
  const handleReset = () => {
    form.resetFields();
  };

  return (
    <Form
      form={form}
      layout={layout.formLayout || 'horizontal'}
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 14 }}
      onFinish={handleSubmit}
      style={{ maxWidth: 800, margin: '20px auto' }}
    >
      {(layout.fields || []).map((field) => (
        <Form.Item
          key={field.key}
          name={field.key}
          label={field.label}
          rules={[
            { required: field.required, message: `请输入${field.label}` },
            ...(field.rules || []).map((rule) => ({
              type: rule.type,
              pattern: rule.pattern ? new RegExp(rule.pattern) : undefined,
              min: rule.min,
              max: rule.max,
              message: rule.message,
            })),
          ]}
          tooltip={field.tooltip}
          initialValue={field.defaultValue}
        >
          {renderField(field)}
        </Form.Item>
      ))}

      <Form.Item wrapperCol={{ offset: 6, span: 14 }}>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {layout.submitText || '提交'}
          </Button>
          {layout.showReset !== false && <Button onClick={handleReset}>重置</Button>}
        </Space>
      </Form.Item>
    </Form>
  );
}

/**
 * 渲染表单字段
 */
function renderField(field: any): React.ReactNode {
  switch (field.type) {
    case 'input':
      return <Input placeholder={field.placeholder} disabled={field.disabled} />;

    case 'number':
      return (
        <InputNumber
          placeholder={field.placeholder}
          disabled={field.disabled}
          style={{ width: '100%' }}
        />
      );

    case 'select':
      return (
        <Select placeholder={field.placeholder} disabled={field.disabled}>
          {(field.options || []).map((opt: any) => (
            <Select.Option key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Option>
          ))}
        </Select>
      );

    case 'date':
      return (
        <DatePicker
          placeholder={field.placeholder}
          disabled={field.disabled}
          style={{ width: '100%' }}
        />
      );

    case 'datetime':
      return (
        <DatePicker
          showTime
          placeholder={field.placeholder}
          disabled={field.disabled}
          style={{ width: '100%' }}
        />
      );

    case 'textarea':
      return <Input.TextArea rows={4} placeholder={field.placeholder} disabled={field.disabled} />;

    case 'switch':
      return <Switch disabled={field.disabled} />;

    case 'radio':
      return (
        <Radio.Group disabled={field.disabled}>
          {(field.options || []).map((opt: any) => (
            <Radio key={opt.value} value={opt.value}>
              {opt.label}
            </Radio>
          ))}
        </Radio.Group>
      );

    case 'checkbox':
      return (
        <Checkbox.Group disabled={field.disabled}>
          {(field.options || []).map((opt: any) => (
            <Checkbox key={opt.value} value={opt.value}>
              {opt.label}
            </Checkbox>
          ))}
        </Checkbox.Group>
      );

    default:
      return <Input placeholder={field.placeholder} disabled={field.disabled} />;
  }
}
