/**
 * 配置模板管理组件
 *
 * 支持保存、加载、导入、导出工作空间配置模板。
 *
 * @module pages/WorkspaceEditor/components/TemplateManager
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Card,
  List,
  Button,
  Input,
  Tag,
  Space,
  Typography,
  Empty,
  Spin,
  message,
  Popconfirm,
  Dropdown,
  Form,
  Select,
  Divider,
} from 'antd';
import {
  SaveOutlined,
  DownloadOutlined,
  UploadOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  MoreOutlined,
  FolderOutlined,
  FileOutlined,
  StarOutlined,
  StarFilled,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;
const V1_TAB_LAYOUT_TYPES = new Set(['form-detail', 'list', 'form', 'detail']);

// 模板类型
export type TemplateType = 'workspace' | 'layout' | 'function-set' | 'workflow';

// 模板分类
export type TemplateCategory = 'standard' | 'gaming' | 'analytics' | 'admin' | 'custom';

// 模板元数据
export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  category: TemplateCategory;
  tags: string[];
  version: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  isBuiltIn: boolean;
  usageCount: number;
  thumbnail?: string;
}

// 模板完整数据
export interface Template extends TemplateMeta {
  config: Record<string, any>;
}

function isV1TemplateConfig(config: Record<string, any> | undefined): boolean {
  const layout = config?.layout;
  if (!layout || layout.type !== 'tabs' || !Array.isArray(layout.tabs)) {
    return false;
  }
  return layout.tabs.every((tab: any) => V1_TAB_LAYOUT_TYPES.has(tab?.layout?.type));
}

// 内置模板
const BUILTIN_TEMPLATES: Template[] = [
  {
    id: 'tpl-standard-crud',
    name: '标准 CRUD 管理页',
    description: '包含列表、创建、编辑、删除功能的标准管理页面模板',
    type: 'workspace',
    category: 'standard',
    tags: ['CRUD', '管理', '标准'],
    version: '1.0.0',
    author: 'System',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isFavorite: false,
    isBuiltIn: true,
    usageCount: 0,
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'list',
            title: '列表',
            layout: {
              type: 'list',
              columns: ['id', 'name', 'status', 'createdAt'],
            },
          },
          {
            key: 'create',
            title: '创建',
            layout: {
              type: 'form',
              fields: ['name', 'description', 'status'],
            },
          },
        ],
      },
    },
  },
  {
    id: 'tpl-gaming-player',
    name: '玩家管理模板',
    description: '游戏玩家管理页面模板，包含玩家信息、背包、邮件等功能',
    type: 'workspace',
    category: 'gaming',
    tags: ['玩家', '游戏', 'GM'],
    version: '1.0.0',
    author: 'System',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isFavorite: false,
    isBuiltIn: true,
    usageCount: 0,
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'info',
            title: '玩家信息',
            icon: 'UserOutlined',
            layout: { type: 'detail' },
          },
          {
            key: 'inventory',
            title: '背包',
            icon: 'InboxOutlined',
            layout: { type: 'list' },
          },
          {
            key: 'mail',
            title: '邮件',
            icon: 'MailOutlined',
            layout: { type: 'list' },
          },
        ],
      },
    },
  },
  {
    id: 'tpl-admin-users',
    name: '用户管理模板',
    description: '后台用户管理页面模板，包含用户列表、角色分配、权限管理',
    type: 'workspace',
    category: 'admin',
    tags: ['用户', '权限', '后台'],
    version: '1.0.0',
    author: 'System',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isFavorite: false,
    isBuiltIn: true,
    usageCount: 0,
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'users',
            title: '用户列表',
            layout: { type: 'list' },
          },
          {
            key: 'roles',
            title: '角色管理',
            layout: { type: 'list' },
          },
          {
            key: 'permissions',
            title: '权限设置',
            layout: { type: 'tree' },
          },
        ],
      },
    },
  },
];

// 分类颜色
const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  standard: 'blue',
  gaming: 'purple',
  analytics: 'green',
  admin: 'orange',
  custom: 'cyan',
};

// 类型图标
const TYPE_ICONS: Record<TemplateType, React.ReactNode> = {
  workspace: <FolderOutlined />,
  layout: <FileOutlined />,
  'function-set': <StarOutlined />,
  workflow: <StarFilled />,
};

export interface TemplateManagerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (template: Template) => void;
  currentConfig?: Record<string, any>;
  onSaveAsTemplate?: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export default function TemplateManager({
  visible,
  onClose,
  onSelect,
  currentConfig,
  onSaveAsTemplate,
}: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<TemplateType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<TemplateCategory | 'all'>('all');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [saveForm] = Form.useForm();

  // 加载模板
  useEffect(() => {
    if (visible) {
      loadTemplates();
    }
  }, [visible]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      // 这里应该从 API 加载，现在使用内置模板
      // 同时加载本地存储的用户模板
      const storedTemplates = localStorage.getItem('workspace_templates');
      let userTemplates: Template[] = [];

      if (storedTemplates) {
        try {
          userTemplates = JSON.parse(storedTemplates);
        } catch (e) {
          console.error('Failed to parse stored templates', e);
        }
      }

      setTemplates(
        [...BUILTIN_TEMPLATES, ...userTemplates].filter((template) =>
          isV1TemplateConfig(template.config),
        ),
      );
    } catch (error: any) {
      message.error(error.message || '加载模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 过滤模板
  const filteredTemplates = templates.filter((template) => {
    if (searchText) {
      const text = searchText.toLowerCase();
      const matchName = template.name.toLowerCase().includes(text);
      const matchDesc = template.description.toLowerCase().includes(text);
      const matchTags = template.tags.some((tag) => tag.toLowerCase().includes(text));
      if (!matchName && !matchDesc && !matchTags) return false;
    }

    if (filterType !== 'all' && template.type !== filterType) return false;
    if (filterCategory !== 'all' && template.category !== filterCategory) return false;

    return true;
  });

  // 收藏/取消收藏
  const toggleFavorite = (templateId: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t)),
    );
    // 保存到本地存储
    const updatedTemplates = templates.map((t) =>
      t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t,
    );
    const userTemplates = updatedTemplates.filter((t) => !t.isBuiltIn);
    localStorage.setItem('workspace_templates', JSON.stringify(userTemplates));
  };

  // 删除模板
  const deleteTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template?.isBuiltIn) {
      message.warning('内置模板不能删除');
      return;
    }

    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    const userTemplates = templates.filter((t) => !t.isBuiltIn && t.id !== templateId);
    localStorage.setItem('workspace_templates', JSON.stringify(userTemplates));
    message.success('模板已删除');
  };

  // 复制模板
  const duplicateTemplate = (template: Template) => {
    const newTemplate: Template = {
      ...template,
      id: `tpl_${Date.now()}`,
      name: `${template.name} (副本)`,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const userTemplates = templates.filter((t) => !t.isBuiltIn);
    userTemplates.push(newTemplate);
    localStorage.setItem('workspace_templates', JSON.stringify(userTemplates));

    setTemplates((prev) => [...prev, newTemplate]);
    message.success('模板已复制');
  };

  // 导出模板
  const exportTemplate = (template: Template) => {
    const data = JSON.stringify(template, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('模板已导出');
  };

  // 导入模板
  const importTemplate = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const template: Template = JSON.parse(text);

        // 验证模板格式
        if (!template.name || !template.config) {
          throw new Error('无效的模板格式');
        }
        if (!isV1TemplateConfig(template.config)) {
          throw new Error('仅支持 V1 模板：tabs + form-detail/list/form/detail');
        }

        // 生成新 ID
        template.id = `tpl_${Date.now()}`;
        template.isBuiltIn = false;
        template.createdAt = new Date().toISOString();
        template.updatedAt = new Date().toISOString();

        const userTemplates = templates.filter((t) => !t.isBuiltIn);
        userTemplates.push(template);
        localStorage.setItem('workspace_templates', JSON.stringify(userTemplates));

        setTemplates((prev) => [...prev, template]);
        message.success('模板导入成功');
      } catch (error: any) {
        message.error(error.message || '导入失败');
      }
    };
    input.click();
  };

  // 保存当前配置为模板
  const handleSaveAsTemplate = async () => {
    if (!currentConfig) {
      message.warning('没有可保存的配置');
      return;
    }

    try {
      const values = await saveForm.validateFields();
      const template: Template = {
        id: `tpl_${Date.now()}`,
        name: values.name,
        description: values.description || '',
        type: 'workspace',
        category: values.category,
        tags: values.tags || [],
        version: '1.0.0',
        author: 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
        isBuiltIn: false,
        usageCount: 0,
        config: currentConfig,
      };

      const userTemplates = templates.filter((t) => !t.isBuiltIn);
      userTemplates.push(template);
      localStorage.setItem('workspace_templates', JSON.stringify(userTemplates));

      setTemplates((prev) => [...prev, template]);
      setShowSaveModal(false);
      saveForm.resetFields();
      message.success('模板保存成功');

      onSaveAsTemplate?.(template);
    } catch (error) {
      // 表单验证失败
    }
  };

  // 模板操作菜单
  const getTemplateMenuItems = (template: Template): MenuProps['items'] => [
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      label: '复制',
      onClick: () => duplicateTemplate(template),
    },
    {
      key: 'export',
      icon: <DownloadOutlined />,
      label: '导出',
      onClick: () => exportTemplate(template),
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      disabled: template.isBuiltIn,
      onClick: () => deleteTemplate(template.id),
    },
  ];

  return (
    <Modal
      title="配置模板管理"
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ display: 'flex', height: 600 }}>
        {/* 左侧过滤面板 */}
        <div
          style={{
            width: 200,
            borderRight: '1px solid #f0f0f0',
            padding: 16,
            background: '#fafafa',
          }}
        >
          <Title level={5} style={{ marginBottom: 16 }}>
            筛选
          </Title>

          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              按类型
            </Text>
            <Select
              value={filterType}
              onChange={setFilterType}
              style={{ width: '100%', marginTop: 8 }}
              options={[
                { value: 'all', label: '全部' },
                { value: 'workspace', label: '工作空间' },
              ]}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              按分类
            </Text>
            <Select
              value={filterCategory}
              onChange={setFilterCategory}
              style={{ width: '100%', marginTop: 8 }}
              options={[
                { value: 'all', label: '全部' },
                { value: 'standard', label: '标准' },
                { value: 'gaming', label: '游戏' },
                { value: 'analytics', label: '分析' },
                { value: 'admin', label: '管理' },
                { value: 'custom', label: '自定义' },
              ]}
            />
          </div>

          <Divider />

          <Space direction="vertical" style={{ width: '100%' }}>
            <Button icon={<UploadOutlined />} block onClick={importTemplate}>
              导入模板
            </Button>
            {currentConfig && (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                block
                onClick={() => setShowSaveModal(true)}
              >
                保存为模板
              </Button>
            )}
          </Space>
        </div>

        {/* 右侧模板列表 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* 搜索栏 */}
          <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
            <Search
              placeholder="搜索模板名称、描述或标签"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </div>

          {/* 模板列表 */}
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <Empty description="没有找到匹配的模板" />
            ) : (
              <List
                grid={{ gutter: 16, column: 2 }}
                dataSource={filteredTemplates}
                renderItem={(template) => (
                  <List.Item>
                    <Card
                      hoverable
                      size="small"
                      title={
                        <Space>
                          {TYPE_ICONS[template.type]}
                          <span>{template.name}</span>
                          {template.isBuiltIn && (
                            <Tag color="gold" style={{ marginLeft: 4 }}>
                              内置
                            </Tag>
                          )}
                        </Space>
                      }
                      extra={
                        <Space>
                          <Button
                            type="text"
                            size="small"
                            icon={
                              template.isFavorite ? (
                                <StarFilled style={{ color: '#faad14' }} />
                              ) : (
                                <StarOutlined />
                              )
                            }
                            onClick={() => toggleFavorite(template.id)}
                          />
                          <Dropdown
                            menu={{ items: getTemplateMenuItems(template) }}
                            trigger={['click']}
                          >
                            <Button type="text" size="small" icon={<MoreOutlined />} />
                          </Dropdown>
                        </Space>
                      }
                      onClick={() => onSelect(template)}
                      actions={[
                        <Button
                          key="preview"
                          type="link"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewTemplate(template);
                          }}
                        >
                          预览
                        </Button>,
                        <Button
                          key="use"
                          type="link"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(template);
                          }}
                        >
                          使用
                        </Button>,
                      ]}
                    >
                      <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 8, minHeight: 44 }}>
                        {template.description}
                      </Paragraph>
                      <div>
                        <Tag color={CATEGORY_COLORS[template.category]}>{template.category}</Tag>
                        {template.tags.slice(0, 2).map((tag) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            )}
          </div>
        </div>
      </div>

      {/* 预览弹窗 */}
      <Modal
        title={`预览: ${previewTemplate?.name}`}
        open={!!previewTemplate}
        onCancel={() => setPreviewTemplate(null)}
        footer={[
          <Button key="cancel" onClick={() => setPreviewTemplate(null)}>
            取消
          </Button>,
          <Button
            key="use"
            type="primary"
            onClick={() => {
              if (previewTemplate) {
                onSelect(previewTemplate);
                setPreviewTemplate(null);
              }
            }}
          >
            使用此模板
          </Button>,
        ]}
        width={700}
      >
        {previewTemplate && (
          <div>
            <Paragraph>
              <Text strong>描述：</Text>
              {previewTemplate.description}
            </Paragraph>
            <Paragraph>
              <Text strong>类型：</Text>
              {previewTemplate.type}
            </Paragraph>
            <Paragraph>
              <Text strong>分类：</Text>
              <Tag color={CATEGORY_COLORS[previewTemplate.category]}>
                {previewTemplate.category}
              </Tag>
            </Paragraph>
            <Paragraph>
              <Text strong>标签：</Text>
              {previewTemplate.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Paragraph>
            <Divider>配置预览</Divider>
            <pre
              style={{
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 4,
                maxHeight: 300,
                overflow: 'auto',
              }}
            >
              {JSON.stringify(previewTemplate.config, null, 2)}
            </pre>
          </div>
        )}
      </Modal>

      {/* 保存为模板弹窗 */}
      <Modal
        title="保存为模板"
        open={showSaveModal}
        onOk={handleSaveAsTemplate}
        onCancel={() => {
          setShowSaveModal(false);
          saveForm.resetFields();
        }}
      >
        <Form form={saveForm} layout="vertical">
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="输入模板名称" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="输入模板描述" />
          </Form.Item>

          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择类型' }]}
            initialValue="workspace"
          >
            <Select options={[{ value: 'workspace', label: '工作空间' }]} />
          </Form.Item>

          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
            initialValue="custom"
          >
            <Select
              options={[
                { value: 'standard', label: '标准' },
                { value: 'gaming', label: '游戏' },
                { value: 'analytics', label: '分析' },
                { value: 'admin', label: '管理' },
                { value: 'custom', label: '自定义' },
              ]}
            />
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签后按回车" tokenSeparators={[',']} />
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
}
