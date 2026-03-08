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
  Segmented,
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
import type { WorkspaceConfig } from '@/types/workspace';
import WorkspaceRenderer from '@/components/WorkspaceRenderer';
import { CodeEditor } from '@/components/MonacoDynamic';

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;
const V1_TAB_LAYOUT_TYPES = new Set([
  'form-detail',
  'list',
  'form',
  'detail',
  'kanban',
  'timeline',
  'split',
  'wizard',
  'dashboard',
]);

// 模板类型
export type TemplateType = 'workspace' | 'layout' | 'function-set' | 'workflow';
export type TemplateScope = 'builtin' | 'team' | 'personal';

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
  scope?: TemplateScope;
}

// 模板完整数据
export interface Template extends TemplateMeta {
  config: Record<string, any>;
}

function toPreviewWorkspaceConfig(template: Template): WorkspaceConfig {
  const cfg = (template?.config || {}) as Record<string, any>;
  return {
    objectKey: `template.${template.id}`,
    title: template.name || '模板预览',
    description: template.description || '',
    layout: (cfg.layout || { type: 'tabs', tabs: [] }) as any,
    status: 'draft',
    published: false,
  };
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
    id: 'tpl-layout-list-empty',
    name: '列表布局-空模板',
    description: '最小列表布局，适合从零开始配置',
    type: 'layout',
    category: 'standard',
    tags: ['list', 'empty'],
    version: '1.0.0',
    author: 'System',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isFavorite: false,
    isBuiltIn: true,
    usageCount: 0,
    scope: 'builtin',
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'list',
            title: '列表',
            functions: [],
            layout: { type: 'list', listFunction: '', columns: [] },
          },
        ],
      },
    },
  },
  {
    id: 'tpl-layout-kanban-standard',
    name: '看板布局-标准模板',
    description: '待处理/处理中/已完成三列看板',
    type: 'layout',
    category: 'standard',
    tags: ['kanban', 'standard'],
    version: '1.0.0',
    author: 'System',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isFavorite: false,
    isBuiltIn: true,
    usageCount: 0,
    scope: 'builtin',
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'kanban',
            title: '看板',
            functions: [],
            layout: {
              type: 'kanban',
              dataFunction: '',
              columns: [
                { id: 'todo', title: '待处理', color: '#1677ff' },
                { id: 'processing', title: '处理中', color: '#faad14' },
                { id: 'done', title: '已完成', color: '#52c41a' },
              ],
            },
          },
        ],
      },
    },
  },
  {
    id: 'tpl-layout-timeline-standard',
    name: '时间线布局-标准模板',
    description: '事件流时间线，带筛选与逆序',
    type: 'layout',
    category: 'standard',
    tags: ['timeline', 'standard'],
    version: '1.0.0',
    author: 'System',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isFavorite: false,
    isBuiltIn: true,
    usageCount: 0,
    scope: 'builtin',
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'timeline',
            title: '时间线',
            functions: [],
            layout: { type: 'timeline', dataFunction: '', showFilter: true, reverse: true },
          },
        ],
      },
    },
  },
  {
    id: 'tpl-layout-split-master-detail',
    name: '主从布局-标准模板',
    description: '左列表右详情的主从分栏',
    type: 'layout',
    category: 'standard',
    tags: ['split', 'master-detail'],
    version: '1.0.0',
    author: 'System',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isFavorite: false,
    isBuiltIn: true,
    usageCount: 0,
    scope: 'builtin',
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'master-detail',
            title: '主从视图',
            functions: [],
            layout: {
              type: 'split',
              direction: 'horizontal',
              panels: [
                {
                  key: 'left',
                  title: '主列表',
                  span: 12,
                  component: { type: 'list', config: { listFunction: '', columns: [] } },
                },
                {
                  key: 'right',
                  title: '详情',
                  span: 12,
                  component: { type: 'detail', config: { detailFunction: '', sections: [] } },
                },
              ],
            },
          },
        ],
      },
    },
  },
  {
    id: 'tpl-layout-wizard-standard',
    name: '向导布局-标准模板',
    description: '两步向导流程模板',
    type: 'layout',
    category: 'standard',
    tags: ['wizard', 'standard'],
    version: '1.0.0',
    author: 'System',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isFavorite: false,
    isBuiltIn: true,
    usageCount: 0,
    scope: 'builtin',
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'wizard',
            title: '向导流程',
            functions: [],
            layout: {
              type: 'wizard',
              steps: [
                {
                  key: 'step1',
                  title: '信息填写',
                  component: { type: 'form', config: { submitFunction: '', fields: [] } },
                },
                {
                  key: 'step2',
                  title: '结果确认',
                  component: { type: 'detail', config: { detailFunction: '', sections: [] } },
                },
              ],
            },
          },
        ],
      },
    },
  },
  {
    id: 'tpl-layout-dashboard-standard',
    name: '仪表盘布局-标准模板',
    description: '指标卡 + 数据面板',
    type: 'layout',
    category: 'analytics',
    tags: ['dashboard', 'analytics'],
    version: '1.0.0',
    author: 'System',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isFavorite: false,
    isBuiltIn: true,
    usageCount: 0,
    scope: 'builtin',
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'dashboard',
            title: '仪表盘',
            functions: [],
            layout: {
              type: 'dashboard',
              stats: [
                { key: 'online', title: '在线人数', value: 0 },
                { key: 'dau', title: 'DAU', value: 0 },
              ],
              panels: [
                {
                  key: 'p1',
                  title: '列表',
                  span: 12,
                  component: { type: 'list', config: { listFunction: '', columns: [] } },
                },
                {
                  key: 'p2',
                  title: '详情',
                  span: 12,
                  component: { type: 'detail', config: { detailFunction: '', sections: [] } },
                },
              ],
            },
          },
        ],
      },
    },
  },
  {
    id: 'tpl-layout-grid-standard',
    name: '网格布局-标准模板',
    description: '双列网格，左列表右详情',
    type: 'layout',
    category: 'standard',
    tags: ['grid', 'standard'],
    version: '1.0.0',
    author: 'System',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isFavorite: false,
    isBuiltIn: true,
    usageCount: 0,
    scope: 'builtin',
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'grid',
            title: '网格',
            functions: [],
            layout: {
              type: 'grid',
              columns: 2,
              items: [
                {
                  key: 'item-list',
                  component: { type: 'list', config: { listFunction: '', columns: [] } },
                },
                {
                  key: 'item-detail',
                  component: { type: 'detail', config: { detailFunction: '', sections: [] } },
                },
              ],
            },
          },
        ],
      },
    },
  },
  {
    id: 'tpl-layout-custom-empty',
    name: '自定义布局-空模板',
    description: '自定义组件占位模板',
    type: 'layout',
    category: 'custom',
    tags: ['custom', 'empty'],
    version: '1.0.0',
    author: 'System',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isFavorite: false,
    isBuiltIn: true,
    usageCount: 0,
    scope: 'builtin',
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'custom',
            title: '自定义',
            functions: [],
            layout: { type: 'custom', component: 'CustomPanel', props: {} },
          },
        ],
      },
    },
  },
  {
    id: 'tpl-gaming-list-drawer-form',
    name: '游戏运营-列表+抽屉表单',
    description: '适合活动配置/补偿管理：列表 + 抽屉编辑 + 弹窗创建',
    type: 'workspace',
    category: 'gaming',
    tags: ['gaming', 'list', 'drawer', 'form'],
    version: '1.0.0',
    author: 'System',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isFavorite: false,
    isBuiltIn: true,
    usageCount: 0,
    scope: 'builtin',
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'ops-list',
            title: '运营列表',
            functions: [],
            layout: {
              type: 'list',
              listFunction: '',
              columns: [
                { key: 'id', title: 'ID' },
                { key: 'name', title: '名称' },
              ],
              toolbarActions: [
                {
                  key: 'create',
                  label: '新建',
                  type: 'modal',
                  function: '',
                  fields: [{ key: 'name', label: '名称', type: 'input', required: true }],
                },
              ],
              rowActions: [
                {
                  key: 'edit',
                  label: '编辑',
                  type: 'drawer',
                  function: '',
                  fields: [{ key: 'name', label: '名称', type: 'input', required: true }],
                },
              ],
            },
          },
        ],
      },
    },
  },
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
    scope: 'builtin',
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'list',
            title: '列表',
            functions: [],
            layout: {
              type: 'list',
              listFunction: '',
              columns: [
                { key: 'id', title: 'ID' },
                { key: 'name', title: '名称' },
                { key: 'status', title: '状态' },
                { key: 'createdAt', title: '创建时间', render: 'datetime' },
              ],
              toolbarActions: [
                {
                  key: 'create',
                  label: '新建',
                  type: 'modal',
                  function: '',
                  fields: [
                    { key: 'name', label: '名称', type: 'input', required: true },
                    {
                      key: 'status',
                      label: '状态',
                      type: 'select',
                      options: [
                        { label: '启用', value: 'active' },
                        { label: '禁用', value: 'disabled' },
                      ],
                    },
                  ],
                },
              ],
              rowActions: [
                {
                  key: 'edit',
                  label: '编辑',
                  type: 'drawer',
                  function: '',
                  fields: [
                    { key: 'name', label: '名称', type: 'input', required: true },
                    {
                      key: 'status',
                      label: '状态',
                      type: 'select',
                      options: [
                        { label: '启用', value: 'active' },
                        { label: '禁用', value: 'disabled' },
                      ],
                    },
                  ],
                },
                {
                  key: 'delete',
                  label: '删除',
                  type: 'popconfirm',
                  function: '',
                  danger: true,
                  confirmMessage: '确认删除该记录？',
                },
              ],
            },
          },
          {
            key: 'create',
            title: '创建',
            functions: [],
            layout: {
              type: 'form',
              submitFunction: '',
              fields: [
                { key: 'name', label: '名称', type: 'input', required: true },
                { key: 'description', label: '描述', type: 'textarea' },
                {
                  key: 'status',
                  label: '状态',
                  type: 'select',
                  options: [
                    { label: '启用', value: 'active' },
                    { label: '禁用', value: 'disabled' },
                  ],
                },
              ],
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
    scope: 'builtin',
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'info',
            title: '玩家信息',
            icon: 'UserOutlined',
            layout: {
              type: 'detail',
              detailFunction: '',
              sections: [
                {
                  title: '基础信息',
                  fields: [
                    { key: 'playerId', label: '玩家ID' },
                    { key: 'nickname', label: '昵称' },
                    { key: 'level', label: '等级' },
                    { key: 'vip', label: 'VIP' },
                  ],
                },
              ],
            },
          },
          {
            key: 'inventory',
            title: '背包',
            icon: 'InboxOutlined',
            layout: {
              type: 'list',
              listFunction: '',
              columns: [
                { key: 'itemId', title: '道具ID' },
                { key: 'itemName', title: '道具名' },
                { key: 'count', title: '数量' },
                { key: 'expireAt', title: '过期时间', render: 'datetime' },
              ],
            },
          },
          {
            key: 'mail',
            title: '邮件',
            icon: 'MailOutlined',
            layout: {
              type: 'list',
              listFunction: '',
              columns: [
                { key: 'mailId', title: '邮件ID' },
                { key: 'title', title: '标题' },
                { key: 'status', title: '状态' },
                { key: 'createdAt', title: '发送时间', render: 'datetime' },
              ],
            },
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
    scope: 'builtin',
    config: {
      layout: {
        type: 'tabs',
        tabs: [
          {
            key: 'users',
            title: '用户列表',
            layout: {
              type: 'list',
              listFunction: '',
              columns: [
                { key: 'userId', title: '用户ID' },
                { key: 'username', title: '用户名' },
                { key: 'status', title: '状态' },
                { key: 'updatedAt', title: '更新时间', render: 'datetime' },
              ],
            },
          },
          {
            key: 'roles',
            title: '角色管理',
            layout: {
              type: 'list',
              listFunction: '',
              columns: [
                { key: 'roleId', title: '角色ID' },
                { key: 'roleName', title: '角色名' },
                { key: 'memberCount', title: '成员数' },
              ],
            },
          },
          {
            key: 'permissions',
            title: '权限设置',
            layout: {
              type: 'detail',
              detailFunction: '',
              sections: [
                {
                  title: '权限信息',
                  fields: [
                    { key: 'role', label: '角色' },
                    { key: 'scopes', label: '权限范围' },
                    { key: 'updatedBy', label: '最后修改人' },
                  ],
                },
              ],
            },
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
  const [filterScope, setFilterScope] = useState<TemplateScope | 'all'>('all');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewMode, setPreviewMode] = useState<'page' | 'json'>('page');
  const [saveForm] = Form.useForm();

  const persistTemplates = (allTemplates: Template[]) => {
    const personalTemplates = allTemplates.filter(
      (t) => !t.isBuiltIn && (t.scope || 'personal') === 'personal',
    );
    const teamTemplates = allTemplates.filter(
      (t) => !t.isBuiltIn && (t.scope || 'personal') === 'team',
    );
    localStorage.setItem('workspace_templates', JSON.stringify(personalTemplates));
    localStorage.setItem('workspace_team_templates', JSON.stringify(teamTemplates));
  };

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
      const storedTeamTemplates = localStorage.getItem('workspace_team_templates');
      let userTemplates: Template[] = [];
      let teamTemplates: Template[] = [];

      if (storedTemplates) {
        try {
          userTemplates = JSON.parse(storedTemplates);
        } catch (e) {
          console.error('Failed to parse stored templates', e);
        }
      }
      if (storedTeamTemplates) {
        try {
          teamTemplates = JSON.parse(storedTeamTemplates);
        } catch (e) {
          console.error('Failed to parse stored team templates', e);
        }
      }

      userTemplates = userTemplates.map((item) => ({ ...item, scope: item.scope || 'personal' }));
      teamTemplates = teamTemplates.map((item) => ({ ...item, scope: item.scope || 'team' }));

      setTemplates(
        [...BUILTIN_TEMPLATES, ...teamTemplates, ...userTemplates].filter((template) =>
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
    if (filterScope !== 'all' && (template.scope || 'personal') !== filterScope) return false;

    return true;
  });

  // 收藏/取消收藏
  const toggleFavorite = (templateId: string) => {
    const updatedTemplates = templates.map((t) =>
      t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t,
    );
    setTemplates(updatedTemplates);
    persistTemplates(updatedTemplates);
  };

  // 删除模板
  const deleteTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template?.isBuiltIn) {
      message.warning('内置模板不能删除');
      return;
    }

    const updatedTemplates = templates.filter((t) => t.id !== templateId);
    setTemplates(updatedTemplates);
    persistTemplates(updatedTemplates);
    message.success('模板已删除');
  };

  // 复制模板
  const duplicateTemplate = (template: Template) => {
    const newTemplate: Template = {
      ...template,
      id: `tpl_${Date.now()}`,
      name: `${template.name} (副本)`,
      isBuiltIn: false,
      scope: 'personal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    persistTemplates(updatedTemplates);
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
          throw new Error(
            '仅支持 V1 模板：tabs + form-detail/list/form/detail/kanban/timeline/split/wizard/dashboard/grid/custom',
          );
        }

        // 生成新 ID
        template.id = `tpl_${Date.now()}`;
        template.isBuiltIn = false;
        template.scope = template.scope || 'personal';
        template.createdAt = new Date().toISOString();
        template.updatedAt = new Date().toISOString();

        const updatedTemplates = [...templates, template];
        setTemplates(updatedTemplates);
        persistTemplates(updatedTemplates);
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
        scope: values.scope || 'personal',
        config: currentConfig,
      };

      const updatedTemplates = [...templates, template];
      setTemplates(updatedTemplates);
      persistTemplates(updatedTemplates);
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
                { value: 'layout', label: '布局模板' },
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

          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              按来源
            </Text>
            <Select
              value={filterScope}
              onChange={setFilterScope}
              style={{ width: '100%', marginTop: 8 }}
              options={[
                { value: 'all', label: '全部' },
                { value: 'builtin', label: '内置' },
                { value: 'team', label: '团队' },
                { value: 'personal', label: '个人' },
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
                            setPreviewMode('page');
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
                        <Tag>
                          {template.scope === 'builtin'
                            ? '内置'
                            : template.scope === 'team'
                            ? '团队'
                            : '个人'}
                        </Tag>
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
        onCancel={() => {
          setPreviewTemplate(null);
          setPreviewMode('page');
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setPreviewTemplate(null);
              setPreviewMode('page');
            }}
          >
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
        width="92vw"
        styles={{ body: { paddingTop: 12 } }}
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
            <Divider>预览模式</Divider>
            <Segmented
              style={{ marginBottom: 12 }}
              value={previewMode}
              onChange={(v) => setPreviewMode(v as 'page' | 'json')}
              options={[
                { label: '页面预览', value: 'page' },
                { label: 'JSON 预览', value: 'json' },
              ]}
            />
            {previewMode === 'page' ? (
              <div
                style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: 6,
                  minHeight: '62vh',
                  maxHeight: '72vh',
                  overflow: 'auto',
                  padding: 12,
                }}
              >
                <WorkspaceRenderer
                  key={`tpl-preview-${previewTemplate.id}-${previewMode}`}
                  config={toPreviewWorkspaceConfig(previewTemplate)}
                  loading={false}
                  context={{ templatePreview: true }}
                />
              </div>
            ) : (
              <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
                <CodeEditor
                  value={JSON.stringify(previewTemplate.config, null, 2)}
                  language="json"
                  height={420}
                  readOnly
                  options={{
                    lineNumbers: 'on',
                    renderLineHighlight: 'line',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    minimap: { enabled: false },
                  }}
                />
              </div>
            )}
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

          <Form.Item name="scope" label="保存到" initialValue="personal">
            <Select
              options={[
                { value: 'personal', label: '个人模板' },
                { value: 'team', label: '团队模板' },
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
