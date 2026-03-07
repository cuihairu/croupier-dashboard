/**
 * 布局设计器组件
 *
 * 可视化设计 Workspace 布局。
 *
 * @module pages/WorkspaceEditor/components/LayoutDesigner
 */

import React from 'react';
import { Card, Tabs, Button, Empty, Modal, Form, Input, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { WorkspaceConfig, TabConfig } from '@/types/workspace';
import type { FunctionDescriptor } from '@/services/api/functions';
import TabEditor from './TabEditor';
import IconPicker from './IconPicker';

export interface LayoutDesignerProps {
  config: WorkspaceConfig | null;
  onChange: (config: WorkspaceConfig) => void;
  descriptors?: FunctionDescriptor[];
}

/**
 * 布局设计器组件
 */
export default function LayoutDesigner({
  config,
  onChange,
  descriptors = [],
}: LayoutDesignerProps) {
  const [activeKey, setActiveKey] = React.useState<string>();
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [form] = Form.useForm();

  if (!config) {
    return (
      <Card style={{ height: 'calc(100vh - 200px)' }}>
        <Empty description="请先选择对象" />
      </Card>
    );
  }

  const isTabsLayout = config.layout.type === 'tabs';
  const tabs = isTabsLayout ? config.layout.tabs || [] : [];

  // 添加 Tab
  const handleAddTab = () => {
    setShowAddModal(true);
  };

  // 确认添加 Tab
  const handleConfirmAdd = async () => {
    try {
      const values = await form.validateFields();
      const newTab: TabConfig = {
        key: `tab_${Date.now()}`,
        title: values.title,
        icon: values.icon,
        functions: [],
        layout: {
          type: 'list',
          listFunction: '',
          columns: [],
        },
      };

      onChange({
        ...config,
        layout: {
          ...config.layout,
          tabs: [...tabs, newTab],
        },
      });

      setActiveKey(newTab.key);
      setShowAddModal(false);
      form.resetFields();
    } catch (error) {
      // 验证失败
    }
  };

  // 删除 Tab
  const handleDeleteTab = (tabKey: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个标签页吗？',
      onOk: () => {
        onChange({
          ...config,
          layout: {
            ...config.layout,
            tabs: tabs.filter((t) => t.key !== tabKey),
          },
        });

        // 如果删除的是当前激活的 Tab，切换到第一个
        if (activeKey === tabKey && tabs.length > 1) {
          const remainingTabs = tabs.filter((t) => t.key !== tabKey);
          setActiveKey(remainingTabs[0]?.key);
        }
      },
    });
  };

  // 更新 Tab
  const handleUpdateTab = (tabKey: string, updatedTab: TabConfig) => {
    onChange({
      ...config,
      layout: {
        ...config.layout,
        tabs: tabs.map((t) => (t.key === tabKey ? updatedTab : t)),
      },
    });
  };

  // 生成 Tabs 配置
  const tabItems = tabs.map((tab) => ({
    key: tab.key,
    label: (
      <span>
        {tab.title}
        <DeleteOutlined
          style={{ marginLeft: 8, color: '#ff4d4f' }}
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteTab(tab.key);
          }}
        />
      </span>
    ),
    children: (
      <TabEditor
        tab={tab}
        onChange={(updatedTab) => handleUpdateTab(tab.key, updatedTab)}
        descriptors={descriptors}
      />
    ),
  }));

  return (
    <>
      <Card
        title="布局设计"
        style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddTab}
            disabled={!isTabsLayout}
          >
            添加 Tab
          </Button>
        }
      >
        {!isTabsLayout && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="当前配置不是 tabs 布局"
            description="V1 仅支持 tabs 顶层布局，请先转换后再编辑。"
            action={
              <Button
                size="small"
                type="primary"
                onClick={() =>
                  onChange({
                    ...config,
                    layout: {
                      type: 'tabs',
                      tabs: [],
                    },
                  })
                }
              >
                转换为 tabs
              </Button>
            }
          />
        )}
        {tabs.length > 0 ? (
          <Tabs activeKey={activeKey} onChange={setActiveKey} items={tabItems} type="card" />
        ) : (
          <Empty description="暂无标签页，点击上方按钮添加" />
        )}
      </Card>

      {/* 添加 Tab 模态框 */}
      <Modal
        title="添加标签页"
        open={showAddModal}
        onOk={handleConfirmAdd}
        onCancel={() => {
          setShowAddModal(false);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入标题" />
          </Form.Item>

          <Form.Item name="icon" label="图标">
            <IconPicker />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
