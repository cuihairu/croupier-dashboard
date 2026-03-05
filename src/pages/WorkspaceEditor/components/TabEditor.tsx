/**
 * Tab 编辑器组件
 *
 * 编辑单个 Tab 的配置。
 *
 * @module pages/WorkspaceEditor/components/TabEditor
 */

import React from 'react';
import { Form, Input, Select, Card, Space, List, Tag, Button, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { TabConfig } from '@/types/workspace';

export interface TabEditorProps {
  /** Tab 配置 */
  tab: TabConfig;

  /** 配置变化回调 */
  onChange: (tab: TabConfig) => void;
}

/**
 * Tab 编辑器组件
 */
export default function TabEditor({ tab, onChange }: TabEditorProps) {
  // 更新基本信息
  const handleBasicChange = (field: string, value: any) => {
    onChange({
      ...tab,
      [field]: value,
    });
  };

  // 更新布局类型
  const handleLayoutTypeChange = (type: string) => {
    // 根据布局类型创建默认配置
    let defaultLayout: any = { type };

    switch (type) {
      case 'form-detail':
        defaultLayout = {
          type: 'form-detail',
          queryFunction: '',
          queryFields: [],
          detailSections: [],
          actions: [],
        };
        break;

      case 'list':
        defaultLayout = {
          type: 'list',
          listFunction: '',
          columns: [],
        };
        break;

      case 'form':
        defaultLayout = {
          type: 'form',
          submitFunction: '',
          fields: [],
        };
        break;

      case 'detail':
        defaultLayout = {
          type: 'detail',
          detailFunction: '',
          sections: [],
        };
        break;
    }

    onChange({
      ...tab,
      layout: defaultLayout,
    });
  };

  // 处理拖拽放置
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const funcData = e.dataTransfer.getData('function');
    if (funcData) {
      try {
        const func = JSON.parse(funcData);
        handleAddFunction(func.id);
      } catch (error) {
        message.error('添加函数失败');
      }
    }
  };

  // 添加函数
  const handleAddFunction = (functionId: string) => {
    if (!tab.functions.includes(functionId)) {
      onChange({
        ...tab,
        functions: [...tab.functions, functionId],
      });
      message.success('添加成功');
    } else {
      message.warning('函数已存在');
    }
  };

  // 删除函数
  const handleRemoveFunction = (functionId: string) => {
    onChange({
      ...tab,
      functions: tab.functions.filter((f) => f !== functionId),
    });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* 基本信息 */}
      <Card title="基本信息" size="small">
        <Form layout="vertical">
          <Form.Item label="标题">
            <Input
              value={tab.title}
              onChange={(e) => handleBasicChange('title', e.target.value)}
              placeholder="请输入标题"
            />
          </Form.Item>

          <Form.Item label="图标" tooltip="Ant Design Icons 图标名称">
            <Input
              value={tab.icon}
              onChange={(e) => handleBasicChange('icon', e.target.value)}
              placeholder="如: UserOutlined"
            />
          </Form.Item>
        </Form>
      </Card>

      {/* 布局类型 */}
      <Card title="布局类型" size="small">
        <Select value={tab.layout.type} onChange={handleLayoutTypeChange} style={{ width: '100%' }}>
          <Select.Option value="form-detail">表单-详情</Select.Option>
          <Select.Option value="list">列表</Select.Option>
          <Select.Option value="form">表单</Select.Option>
          <Select.Option value="detail">详情</Select.Option>
        </Select>
      </Card>

      {/* 使用的函数 */}
      <Card
        title="使用的函数"
        size="small"
        extra={<span style={{ fontSize: 12, color: '#999' }}>从左侧拖拽函数到这里</span>}
      >
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            minHeight: 100,
            border: '2px dashed #d9d9d9',
            borderRadius: 4,
            padding: 16,
            backgroundColor: '#fafafa',
          }}
        >
          {tab.functions.length > 0 ? (
            <List
              dataSource={tab.functions}
              renderItem={(funcId) => (
                <List.Item
                  actions={[
                    <Button
                      type="link"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveFunction(funcId)}
                    />,
                  ]}
                >
                  <Tag color="blue">{funcId}</Tag>
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#999' }}>拖拽函数到这里</div>
          )}
        </div>
      </Card>

      {/* 布局详细配置 */}
      <Card title="布局配置" size="small">
        {renderLayoutConfig(tab.layout, (layout) => {
          onChange({ ...tab, layout });
        })}
      </Card>
    </Space>
  );
}

/**
 * 渲染布局配置
 */
function renderLayoutConfig(layout: any, onChange: (layout: any) => void): React.ReactNode {
  switch (layout.type) {
    case 'form-detail':
      return renderFormDetailConfig(layout, onChange);

    case 'list':
      return renderListConfig(layout, onChange);

    case 'form':
      return renderFormConfig(layout, onChange);

    case 'detail':
      return renderDetailConfig(layout, onChange);

    default:
      return <div style={{ color: '#999' }}>请选择布局类型</div>;
  }
}

/**
 * 渲染表单-详情配置
 */
function renderFormDetailConfig(layout: any, onChange: (layout: any) => void): React.ReactNode {
  return (
    <Form layout="vertical">
      <Form.Item label="查询函数">
        <Input
          value={layout.queryFunction}
          onChange={(e) => onChange({ ...layout, queryFunction: e.target.value })}
          placeholder="请输入查询函数 ID"
        />
      </Form.Item>
      <div style={{ color: '#999', fontSize: 12 }}>更多配置项将在后续版本中添加</div>
    </Form>
  );
}

/**
 * 渲染列表配置
 */
function renderListConfig(layout: any, onChange: (layout: any) => void): React.ReactNode {
  return (
    <Form layout="vertical">
      <Form.Item label="列表函数">
        <Input
          value={layout.listFunction}
          onChange={(e) => onChange({ ...layout, listFunction: e.target.value })}
          placeholder="请输入列表函数 ID"
        />
      </Form.Item>
      <div style={{ color: '#999', fontSize: 12 }}>更多配置项将在后续版本中添加</div>
    </Form>
  );
}

/**
 * 渲染表单配置
 */
function renderFormConfig(layout: any, onChange: (layout: any) => void): React.ReactNode {
  return (
    <Form layout="vertical">
      <Form.Item label="提交函数">
        <Input
          value={layout.submitFunction}
          onChange={(e) => onChange({ ...layout, submitFunction: e.target.value })}
          placeholder="请输入提交函数 ID"
        />
      </Form.Item>
      <div style={{ color: '#999', fontSize: 12 }}>更多配置项将在后续版本中添加</div>
    </Form>
  );
}

/**
 * 渲染详情配置
 */
function renderDetailConfig(layout: any, onChange: (layout: any) => void): React.ReactNode {
  return (
    <Form layout="vertical">
      <Form.Item label="详情函数">
        <Input
          value={layout.detailFunction}
          onChange={(e) => onChange({ ...layout, detailFunction: e.target.value })}
          placeholder="请输入详情函数 ID"
        />
      </Form.Item>
      <div style={{ color: '#999', fontSize: 12 }}>更多配置项将在后续版本中添加</div>
    </Form>
  );
}
