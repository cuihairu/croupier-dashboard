/**
 * 画布编辑器状态管理
 *
 * 使用 Zustand 管理画布编辑器的状态。
 *
 * @module pages/WorkspaceEditor/utils/canvasStore
 */

import { create } from 'zustand';
import { generate as generateId } from 'shortid';

/** 画布组件类型 */
export type CanvasComponentType =
  | 'container' // 容器
  | 'section' // 分区
  | 'row' // 行
  | 'col' // 列
  | 'field' // 字段
  | 'button' // 按钮
  | 'text' // 文本
  | 'divider' // 分割线
  | 'spacer'; // 占位符

/** 画布组件 */
export interface CanvasComponent {
  /** 组件 ID */
  id: string;
  /** 组件类型 */
  type: CanvasComponentType;
  /** 组件标题/标签 */
  label?: string;
  /** 组件属性 */
  props: Record<string, any>;
  /** 样式 */
  style?: React.CSSProperties;
  /** 子组件 */
  children?: CanvasComponent[];
  /** 是否可见 */
  visible?: boolean;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 是否可调整大小 */
  resizable?: boolean;
  /** 宽度（用于 col） */
  span?: number;
  /** 数据 key（用于 field） */
  dataKey?: string;
}

/** 画布状态 */
interface CanvasState {
  /** 根组件 */
  rootComponent: CanvasComponent | null;
  /** 选中的组件 ID */
  selectedId: string | null;
  /** 悬停的组件 ID */
  hoveredId: string | null;
  /** 拖拽中的组件 */
  draggingComponent: CanvasComponent | null;
  /** 是否在调整大小 */
  isResizing: boolean;
  /** 历史记录 */
  history: CanvasComponent[];
  /** 历史记录索引 */
  historyIndex: number;
  /** 组件模板库 */
  componentTemplates: CanvasComponentTemplate[];
}

/** 画布操作 */
interface CanvasActions {
  /** 设置根组件 */
  setRootComponent: (component: CanvasComponent) => void;
  /** 选中组件 */
  selectComponent: (id: string | null) => void;
  /** 悬停组件 */
  hoverComponent: (id: string | null) => void;
  /** 添加组件 */
  addComponent: (parentId: string | null, component: CanvasComponent, index?: number) => void;
  /** 删除组件 */
  removeComponent: (id: string) => void;
  /** 更新组件 */
  updateComponent: (id: string, updates: Partial<CanvasComponent>) => void;
  /** 移动组件 */
  moveComponent: (id: string, targetParentId: string, targetIndex: number) => void;
  /** 设置拖拽组件 */
  setDraggingComponent: (component: CanvasComponent | null) => void;
  /** 设置调整大小状态 */
  setResizing: (resizing: boolean) => void;
  /** 撤销 */
  undo: () => void;
  /** 重做 */
  redo: () => void;
  /** 从 Tab 配置转换为画布组件 */
  fromTabConfig: (tabConfig: any) => CanvasComponent;
  /** 转换为 Tab 配置 */
  toTabConfig: () => any | null;
  /** 清空画布 */
  clearCanvas: () => void;
}

/** 组件模板 */
export interface CanvasComponentTemplate {
  type: CanvasComponentType;
  label: string;
  icon: string;
  defaultProps: Record<string, any>;
  defaultStyle?: React.CSSProperties;
  category: 'layout' | 'form' | 'display' | 'other';
}

/** 默认组件模板 */
const DEFAULT_TEMPLATES: CanvasComponentTemplate[] = [
  // 布局类
  {
    type: 'container',
    label: '容器',
    icon: '📦',
    defaultProps: {},
    defaultStyle: { padding: 16, minHeight: 100 },
    category: 'layout',
  },
  {
    type: 'section',
    label: '分区',
    icon: '📋',
    defaultProps: { title: '新建分区' },
    defaultStyle: { marginBottom: 16 },
    category: 'layout',
  },
  {
    type: 'row',
    label: '行',
    icon: '↔️',
    defaultProps: { gutter: 16 },
    category: 'layout',
  },
  {
    type: 'col',
    label: '列',
    icon: '↕️',
    defaultProps: {},
    defaultStyle: {},
    category: 'layout',
  },
  // 表单类
  {
    type: 'field',
    label: '输入框',
    icon: '📝',
    defaultProps: { label: '输入框', placeholder: '请输入' },
    defaultStyle: {},
    category: 'form',
  },
  {
    type: 'field',
    label: '数字输入',
    icon: '🔢',
    defaultProps: { label: '数字', type: 'number' },
    defaultStyle: {},
    category: 'form',
  },
  {
    type: 'field',
    label: '下拉选择',
    icon: '📋',
    defaultProps: { label: '下拉选择', type: 'select', options: [] },
    defaultStyle: {},
    category: 'form',
  },
  {
    type: 'field',
    label: '日期选择',
    icon: '📅',
    defaultProps: { label: '日期', type: 'date' },
    defaultStyle: {},
    category: 'form',
  },
  {
    type: 'field',
    label: '开关',
    icon: '🔘',
    defaultProps: { label: '开关', type: 'switch' },
    defaultStyle: {},
    category: 'form',
  },
  {
    type: 'button',
    label: '按钮',
    icon: '🔳',
    defaultProps: { text: '按钮', type: 'primary' },
    defaultStyle: {},
    category: 'form',
  },
  // 展示类
  {
    type: 'text',
    label: '文本',
    icon: '📄',
    defaultProps: { content: '文本内容' },
    defaultStyle: {},
    category: 'display',
  },
  {
    type: 'divider',
    label: '分割线',
    icon: '➖',
    defaultProps: {},
    defaultStyle: {},
    category: 'display',
  },
  {
    type: 'spacer',
    label: '占位符',
    icon: '⬜',
    defaultProps: { height: 16 },
    defaultStyle: {},
    category: 'display',
  },
];

/**
 * 画布 Store
 */
export const useCanvasStore = create<CanvasState & CanvasActions>((set, get) => ({
  // 状态
  rootComponent: null,
  selectedId: null,
  hoveredId: null,
  draggingComponent: null,
  isResizing: false,
  history: [],
  historyIndex: -1,
  componentTemplates: DEFAULT_TEMPLATES,

  // 设置根组件
  setRootComponent: (component) => {
    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(component);
    set({
      rootComponent: component,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  // 选中组件
  selectComponent: (id) => set({ selectedId: id }),

  // 悬停组件
  hoverComponent: (id) => set({ hoveredId: id }),

  // 添加组件
  addComponent: (parentId, component, index) => {
    const { rootComponent } = get();
    if (!rootComponent) return;

    const addToParent = (parent: CanvasComponent): CanvasComponent => {
      if (parent.id === parentId || (!parentId && parent === rootComponent)) {
        const children = parent.children ? [...parent.children] : [];
        if (index !== undefined) {
          children.splice(index, 0, component);
        } else {
          children.push(component);
        }
        return { ...parent, children };
      }
      if (parent.children) {
        return {
          ...parent,
          children: parent.children.map(addToParent),
        };
      }
      return parent;
    };

    const newRoot = addToParent(rootComponent);
    get().setRootComponent(newRoot);
    set({ selectedId: component.id });
  },

  // 删除组件
  removeComponent: (id) => {
    const { rootComponent, selectedId } = get();
    if (!rootComponent) return;

    const removeFromParent = (parent: CanvasComponent): CanvasComponent => {
      if (parent.children) {
        const filtered = parent.children.filter((c) => c.id !== id);
        if (filtered.length !== parent.children.length) {
          return { ...parent, children: filtered };
        }
        return {
          ...parent,
          children: parent.children.map(removeFromParent),
        };
      }
      return parent;
    };

    const newRoot = removeFromParent(rootComponent);
    get().setRootComponent(newRoot);
    if (selectedId === id) {
      set({ selectedId: null });
    }
  },

  // 更新组件
  updateComponent: (id, updates) => {
    const { rootComponent } = get();
    if (!rootComponent) return;

    const updateInTree = (component: CanvasComponent): CanvasComponent => {
      if (component.id === id) {
        return { ...component, ...updates };
      }
      if (component.children) {
        return {
          ...component,
          children: component.children.map(updateInTree),
        };
      }
      return component;
    };

    const newRoot = updateInTree(rootComponent);
    get().setRootComponent(newRoot);
  },

  // 移动组件
  moveComponent: (id, targetParentId, targetIndex) => {
    const { rootComponent } = get();
    if (!rootComponent) return;

    // 1. 找到要移动的组件
    let movedComponent: CanvasComponent | null = null;
    const findAndRemove = (parent: CanvasComponent): CanvasComponent | null => {
      if (parent.children) {
        const index = parent.children.findIndex((c) => c.id === id);
        if (index >= 0) {
          const [removed] = parent.children.splice(index, 1);
          movedComponent = removed;
          return { ...parent, children: [...parent.children] };
        }
        for (let i = 0; i < parent.children.length; i++) {
          const result = findAndRemove(parent.children[i]);
          if (result) {
            parent.children[i] = result;
            return parent;
          }
        }
      }
      return null;
    };

    let tempRoot = rootComponent;
    findAndRemove(tempRoot);
    if (!movedComponent) return;

    // 2. 添加到目标位置
    const addToTarget = (component: CanvasComponent): CanvasComponent => {
      if (component.id === targetParentId) {
        const children = component.children ? [...component.children] : [];
        if (targetIndex !== undefined) {
          children.splice(targetIndex, 0, movedComponent!);
        } else {
          children.push(movedComponent!);
        }
        return { ...component, children };
      }
      if (component.children) {
        return {
          ...component,
          children: component.children.map(addToTarget),
        };
      }
      return component;
    };

    const newRoot = addToTarget(tempRoot);
    get().setRootComponent(newRoot);
  },

  // 设置拖拽组件
  setDraggingComponent: (component) => set({ draggingComponent: component }),

  // 设置调整大小状态
  setResizing: (resizing) => set({ isResizing: resizing }),

  // 撤销
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({
        rootComponent: history[historyIndex - 1],
        historyIndex: historyIndex - 1,
      });
    }
  },

  // 重做
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({
        rootComponent: history[historyIndex + 1],
        historyIndex: historyIndex + 1,
      });
    }
  },

  // 从 Tab 配置转换为画布组件
  fromTabConfig: (tabConfig) => {
    const layoutType = tabConfig.layout?.type || 'form';

    if (layoutType === 'form') {
      return {
        id: generateId(),
        type: 'container',
        props: { label: '表单容器' },
        style: { padding: 24 },
        children: (tabConfig.layout.fields || []).map((field: any) => ({
          id: generateId(),
          type: 'field',
          label: field.label,
          props: field,
          dataKey: field.key,
        })),
      };
    }

    if (layoutType === 'detail') {
      return {
        id: generateId(),
        type: 'container',
        props: { label: '详情容器' },
        style: { padding: 24 },
        children: (tabConfig.layout.sections || []).map((section: any) => ({
          id: generateId(),
          type: 'section',
          label: section.title,
          props: { title: section.title },
          children: (section.fields || []).map((field: any) => ({
            id: generateId(),
            type: 'field',
            label: field.label,
            props: field,
            dataKey: field.key,
          })),
        })),
      };
    }

    // 默认容器
    return {
      id: generateId(),
      type: 'container',
      props: { label: '容器' },
      style: { padding: 16 },
      children: [],
    };
  },

  // 转换为 Tab 配置
  toTabConfig: () => {
    const { rootComponent } = get();
    if (!rootComponent) return null;

    // 简化版本：只处理基础的 field 转换
    const extractFields = (component: CanvasComponent): any[] => {
      if (component.type === 'field' && component.dataKey) {
        return [component.props];
      }
      if (component.children) {
        return component.children.flatMap(extractFields);
      }
      return [];
    };

    return {
      layout: {
        type: 'form',
        fields: extractFields(rootComponent),
      },
    };
  },

  // 清空画布
  clearCanvas: () => {
    set({
      rootComponent: null,
      selectedId: null,
      hoveredId: null,
      history: [],
      historyIndex: -1,
    });
  },
}));

/**
 * 创建组件实例
 */
export function createComponentInstance(template: CanvasComponentTemplate): CanvasComponent {
  return {
    id: generateId(),
    type: template.type,
    label: template.label,
    props: { ...template.defaultProps },
    style: template.defaultStyle,
    children: [],
  };
}

/**
 * 查找组件
 */
export function findComponent(component: CanvasComponent, id: string): CanvasComponent | null {
  if (component.id === id) return component;
  if (component.children) {
    for (const child of component.children) {
      const found = findComponent(child, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 获取组件路径
 */
export function getComponentPath(
  component: CanvasComponent,
  id: string,
  path: CanvasComponent[] = [],
): CanvasComponent[] | null {
  if (component.id === id) return [...path, component];
  if (component.children) {
    for (const child of component.children) {
      const result = getComponentPath(child, id, [...path, component]);
      if (result) return result;
    }
  }
  return null;
}
