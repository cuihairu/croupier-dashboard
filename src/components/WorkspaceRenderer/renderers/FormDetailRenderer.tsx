/**
 * 表单-详情布局渲染器
 *
 * 先通过表单查询，然后显示详情和操作按钮。
 *
 * @module components/WorkspaceRenderer/renderers/FormDetailRenderer
 */

import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Descriptions,
  message,
  Badge,
  Tag,
} from 'antd';
import type { FormDetailLayout } from '@/types/workspace';
import { invokeFunction } from '@/services/functionInvoke';
import { useAnyPermission } from '@/services/permission';
import * as Icons from '@ant-design/icons';

export interface FormDetailRendererProps {
  /** 表单-详情布局配置 */
  layout: FormDetailLayout;

  /** 对象标识 */
  objectKey: string;

  /** 额外的上下文数据 */
  context?: Record<string, any>;
}

/**
 * 表单-详情布局渲染器组件
 */
export default function FormDetailRenderer({
  layout,
  objectKey,
  context,
}: FormDetailRendererProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  // 处理查询
  const handleQuery = async (values: any) => {
    if (!layout.queryFunction) {
      message.error('未配置查询函数');
      return;
    }

    setLoading(true);
    try {
      // 使用函数调用服务
      const result = await invokeFunction(layout.queryFunction, values);

      setDetailData(result);
      message.success('查询成功');
    } catch (error: any) {
      message.error(error.message || '查询失败');
      setDetailData(null);
    } finally {
      setLoading(false);
    }
  };

  // 处理操作
  const handleAction = async (action: any) => {
    if (!action.function) {
      message.error('未配置操作函数');
      return;
    }

    // TODO: 根据操作类型显示不同的交互方式
    // - modal: 显示模态框
    // - drawer: 显示抽屉
    // - popconfirm: 显示确认框
    // - direct: 直接执行

    try {
      // 使用函数调用服务
      await invokeFunction(action.function, detailData);

      message.success(`${action.label}成功`);
      // 重新查询
      form.submit();
    } catch (error: any) {
      message.error(error.message || `${action.label}失败`);
    }
  };

  // 自动查询
  React.useEffect(() => {
    if (layout.autoQuery) {
      form.submit();
    }
  }, [layout.autoQuery]);

  return (
    <div>
      {/* 查询区 */}
      <Card title="查询条件" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={handleQuery}>
          {(layout.queryFields || []).map((field) => (
            <Form.Item
              key={field.key}
              name={field.key}
              label={field.label}
              rules={[{ required: field.required, message: `请输入${field.label}` }]}
              tooltip={field.tooltip}
            >
              {renderField(field)}
            </Form.Item>
          ))}
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              查询
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 详情区 */}
      {detailData && (
        <>
          {(layout.detailSections || []).map((section, index) => (
            <Card
              key={index}
              title={section.title}
              style={{ marginBottom: 16 }}
              collapsible={section.collapsible ? 'header' : undefined}
              defaultCollapsed={!section.defaultExpanded}
            >
              <Descriptions column={section.column || 2}>
                {section.fields.map((field) => (
                  <Descriptions.Item key={field.key} label={field.label} span={field.span}>
                    {renderDetailField(field, detailData[field.key])}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          ))}

          {/* 操作区 */}
          {layout.actions && layout.actions.length > 0 && (
            <Card title="操作">
              <Space>
                {layout.actions.map((action) => (
                  <Button
                    key={action.key}
                    type={action.buttonType || 'default'}
                    danger={action.danger}
                    icon={getIcon(action.icon)}
                    onClick={() => handleAction(action)}
                    disabled={action.disabled}
                  >
                    {action.label}
                  </Button>
                ))}
              </Space>
            </Card>
          )}
        </>
      )}
    </div>
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
        <Select placeholder={field.placeholder} disabled={field.disabled} style={{ width: 200 }}>
          {(field.options || []).map((opt: any) => (
            <Select.Option key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Option>
          ))}
        </Select>
      );

    case 'textarea':
      return <Input.TextArea rows={4} placeholder={field.placeholder} disabled={field.disabled} />;

    default:
      return <Input placeholder={field.placeholder} disabled={field.disabled} />;
  }
}

/**
 * 渲染详情字段
 */
function renderDetailField(field: any, value: any): React.ReactNode {
  if (!value && value !== 0 && value !== false) return '-';

  const renderType = field.render || 'text';
  const options = field.renderOptions || {};

  switch (renderType) {
    case 'status':
      return renderStatus(value, options);

    case 'datetime':
      return renderDateTime(value, options);

    case 'date':
      return renderDate(value, options);

    case 'tag':
      return renderTag(value, options);

    case 'money':
      return renderMoney(value, options);

    case 'link':
      return renderLink(value, options);

    case 'image':
      return renderImage(value, options);

    case 'text':
    default:
      return value;
  }
}

/**
 * 渲染状态
 */
function renderStatus(value: any, options: any): React.ReactNode {
  const statusMap = options.statusMap || {
    1: { text: '启用', status: 'success' },
    0: { text: '禁用', status: 'default' },
  };

  const status = statusMap[value];
  if (!status) return value;

  return <Badge status={status.status} text={status.text} />;
}

/**
 * 渲染日期时间
 */
function renderDateTime(value: any, options: any): React.ReactNode {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 渲染日期
 */
function renderDate(value: any, options: any): React.ReactNode {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleDateString('zh-CN');
}

/**
 * 渲染标签
 */
function renderTag(value: any, options: any): React.ReactNode {
  const color = options.tagColor || 'blue';
  return <Tag color={typeof color === 'function' ? color(value) : color}>{value}</Tag>;
}

/**
 * 渲染金额
 */
function renderMoney(value: any, options: any): React.ReactNode {
  const symbol = options.currencySymbol || '¥';
  const precision = options.currencyPrecision || 2;
  return `${symbol}${Number(value).toFixed(precision)}`;
}

/**
 * 渲染链接
 */
function renderLink(value: any, options: any): React.ReactNode {
  const target = options.linkTarget || '_blank';
  return (
    <a href={value} target={target} rel="noopener noreferrer">
      {value}
    </a>
  );
}

/**
 * 渲染图片
 */
function renderImage(value: any, options: any): React.ReactNode {
  return <img src={value} alt="" style={{ width: 100, height: 100, objectFit: 'cover' }} />;
}

/**
 * 根据图标名称获取图标组件
 */
function getIcon(iconName?: string): React.ReactNode {
  if (!iconName) return null;
  const IconComponent = (Icons as any)[iconName];
  return IconComponent ? <IconComponent /> : null;
}
