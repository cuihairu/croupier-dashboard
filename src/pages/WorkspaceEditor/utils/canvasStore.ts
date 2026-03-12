/**
 * 画布编辑器状态管理
 *
 * 使用 React Context + useReducer 管理画布编辑器的状态，
 * 与项目其他部分保持一致的状态管理方式。
 *
 * @module pages/WorkspaceEditor/utils/canvasStore
 */

import React, { createContext, useContext, useReducer, useCallback } from 'react';

/** 生成唯一 ID（替代 shortid） */
function generateId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** 画布组件类型 */
export type CanvasComponentType =
  | 'container'
  | 'section'
  | 'row'
  | 'col'
  | 'field'
  | 'button'
  | 'text'
  | 'divider'
  | 'spacer';

/** 画布组件 */
export interface CanvasComponent {
  id: string;
  type: CanvasComponentType;
  label?: string;
  props: Record<string, any>;
  style?: React.CSSProperties;
  children?: CanvasComponent[];
  visible?: boolean;
  draggable?: boolean;
  resizable?: boolean;
  span?: number;
  dataKey?: string;
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

/** 画布状态 */
export interface CanvasState {
  rootComponent: CanvasComponent | null;
  selectedId: string | null;
  hoveredId: string | null;
  draggingComponent: CanvasComponent | null;
  isResizing: boolean;
  history: CanvasComponent[];
  historyIndex: number;
  componentTemplates: CanvasComponentTemplate[];
}

/** Action 类型 */
type CanvasAction =
  | { type: 'SET_ROOT'; payload: CanvasComponent }
  | { type: 'SELECT'; payload: string | null }
  | { type: 'HOVER'; payload: string | null }
  | { type: 'SET_DRAGGING'; payload: CanvasComponent | null }
  | { type: 'SET_RESIZING'; payload: boolean }
  | { type: 'ADD_COMPONENT'; payload: { parentId: string | null; component: CanvasComponent; index?: number } }
  | { type: 'REMOVE_COMPONENT'; payload: string }
  | { type: 'UPDATE_COMPONENT'; payload: { id: string; updates: Partial<CanvasComponent> } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR' };

// ── 树操作纯函数 ──────────────────────────────────────────

function addToTree(
  root: CanvasComponent,
  parentId: string | null,
  component: CanvasComponent,
  index?: number,
): CanvasComponent {
  if (root.id === parentId || parentId === null) {
    const children = root.children ? [...root.children] : [];
    if (index !== undefined) children.splice(index, 0, component);
    else children.push(component);
    return { ...root, children };
  }
  if (root.children) {
    return { ...root, children: root.children.map((c) => addToTree(c, parentId, component, index)) };
  }
  return root;
}

function removeFromTree(root: CanvasComponent, id: string): CanvasComponent {
  if (root.children) {
    const filtered = root.children.filter((c) => c.id !== id);
    if (filtered.length !== root.children.length) {
      return { ...root, children: filtered };
    }
    return { ...root, children: root.children.map((c) => removeFromTree(c, id)) };
  }
  return root;
}

function updateInTree(root: CanvasComponent, id: string, updates: Partial<CanvasComponent>): CanvasComponent {
  if (root.id === id) return { ...root, ...updates };
  if (root.children) {
    return { ...root, children: root.children.map((c) => updateInTree(c, id, updates)) };
  }
  return root;
}

function pushHistory(state: CanvasState, component: CanvasComponent): CanvasState {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(component);
  return { ...state, history: newHistory, historyIndex: newHistory.length - 1, rootComponent: component };
}

// ── Reducer ───────────────────────────────────────────────

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'SET_ROOT':
      return pushHistory(state, action.payload);

    case 'SELECT':
      return { ...state, selectedId: action.payload };

    case 'HOVER':
      return { ...state, hoveredId: action.payload };

    case 'SET_DRAGGING':
      return { ...state, draggingComponent: action.payload };

    case 'SET_RESIZING':
      return { ...state, isResizing: action.payload };

    case 'ADD_COMPONENT': {
      if (!state.rootComponent) return state;
      const { parentId, component, index } = action.payload;
      const newRoot = addToTree(state.rootComponent, parentId, component, index);
      return { ...pushHistory(state, newRoot), selectedId: component.id };
    }

    case 'REMOVE_COMPONENT': {
      if (!state.rootComponent) return state;
      const newRoot = removeFromTree(state.rootComponent, action.payload);
      const selectedId = state.selectedId === action.payload ? null : state.selectedId;
      return { ...pushHistory(state, newRoot), selectedId };
    }

    case 'UPDATE_COMPONENT': {
      if (!state.rootComponent) return state;
      const newRoot = updateInTree(state.rootComponent, action.payload.id, action.payload.updates);
      return pushHistory(state, newRoot);
    }

    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const idx = state.historyIndex - 1;
      return { ...state, rootComponent: state.history[idx], historyIndex: idx };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const idx = state.historyIndex + 1;
      return { ...state, rootComponent: state.history[idx], historyIndex: idx };
    }

    case 'CLEAR':
      return { ...state, rootComponent: null, selectedId: null, hoveredId: null, history: [], historyIndex: -1 };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────

interface CanvasContextValue {
  state: CanvasState;
  dispatch: React.Dispatch<CanvasAction>;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

const DEFAULT_TEMPLATES: CanvasComponentTemplate[] = [
  { type: 'container', label: '容器',    icon: '📦', defaultProps: {},                                    defaultStyle: { padding: 16, minHeight: 100 }, category: 'layout' },
  { type: 'section',   label: '分区',    icon: '📋', defaultProps: { title: '新建分区' },                 defaultStyle: { marginBottom: 16 },            category: 'layout' },
  { type: 'row',       label: '行',      icon: '↔️', defaultProps: { gutter: 16 },                       category: 'layout' },
  { type: 'col',       label: '列',      icon: '↕️', defaultProps: {},                                    category: 'layout' },
  { type: 'field',     label: '输入框',  icon: '📝', defaultProps: { label: '输入框', placeholder: '请输入' }, category: 'form' },
  { type: 'field',     label: '数字输入',icon: '🔢', defaultProps: { label: '数字', type: 'number' },     category: 'form' },
  { type: 'field',     label: '下拉选择',icon: '🔽', defaultProps: { label: '下拉选择', type: 'select', options: [] }, category: 'form' },
  { type: 'field',     label: '日期选择',icon: '📅', defaultProps: { label: '日期', type: 'date' },       category: 'form' },
  { type: 'field',     label: '开关',    icon: '🔘', defaultProps: { label: '开关', type: 'switch' },     category: 'form' },
  { type: 'button',    label: '按钮',    icon: '🔳', defaultProps: { text: '按钮', type: 'primary' },     category: 'form' },
  { type: 'text',      label: '文本',    icon: '📄', defaultProps: { content: '文本内容' },               category: 'display' },
  { type: 'divider',   label: '分割线',  icon: '➖', defaultProps: {},                                    category: 'display' },
  { type: 'spacer',    label: '占位符',  icon: '⬜', defaultProps: { height: 16 },                       category: 'display' },
];

const INITIAL_STATE: CanvasState = {
  rootComponent: null,
  selectedId: null,
  hoveredId: null,
  draggingComponent: null,
  isResizing: false,
  history: [],
  historyIndex: -1,
  componentTemplates: DEFAULT_TEMPLATES,
};

/** Provider：包裹整个画布编辑器 */
export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(canvasReducer, INITIAL_STATE);
  return <CanvasContext.Provider value={{ state, dispatch }}>{children}</CanvasContext.Provider>;
}

/** 获取画布 context（内部使用） */
function useCanvas() {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error('useCanvas must be used within CanvasProvider');
  return ctx;
}

/**
 * 画布 Hook（替代原 useCanvasStore）
 * 接口与原 zustand store 保持一致，消费方无需改动。
 */
export function useCanvasStore() {
  const { state, dispatch } = useCanvas();

  const setRootComponent = useCallback(
    (component: CanvasComponent) => dispatch({ type: 'SET_ROOT', payload: component }),
    [dispatch],
  );

  const selectComponent = useCallback(
    (id: string | null) => dispatch({ type: 'SELECT', payload: id }),
    [dispatch],
  );

  const hoverComponent = useCallback(
    (id: string | null) => dispatch({ type: 'HOVER', payload: id }),
    [dispatch],
  );

  const addComponent = useCallback(
    (parentId: string | null, component: CanvasComponent, index?: number) =>
      dispatch({ type: 'ADD_COMPONENT', payload: { parentId, component, index } }),
    [dispatch],
  );

  const removeComponent = useCallback(
    (id: string) => dispatch({ type: 'REMOVE_COMPONENT', payload: id }),
    [dispatch],
  );

  const updateComponent = useCallback(
    (id: string, updates: Partial<CanvasComponent>) =>
      dispatch({ type: 'UPDATE_COMPONENT', payload: { id, updates } }),
    [dispatch],
  );

  const setDraggingComponent = useCallback(
    (component: CanvasComponent | null) => dispatch({ type: 'SET_DRAGGING', payload: component }),
    [dispatch],
  );

  const setResizing = useCallback(
    (resizing: boolean) => dispatch({ type: 'SET_RESIZING', payload: resizing }),
    [dispatch],
  );

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), [dispatch]);
  const clearCanvas = useCallback(() => dispatch({ type: 'CLEAR' }), [dispatch]);

  const fromTabConfig = useCallback((tabConfig: any): CanvasComponent => {
    const layoutType = tabConfig?.layout?.type || 'form';
    if (layoutType === 'form') {
      return {
        id: generateId(), type: 'container', props: { label: '表单容器' }, style: { padding: 24 },
        children: (tabConfig.layout.fields || []).map((f: any) => ({
          id: generateId(), type: 'field' as const, label: f.label, props: f, dataKey: f.key,
        })),
      };
    }
    if (layoutType === 'detail') {
      return {
        id: generateId(), type: 'container', props: { label: '详情容器' }, style: { padding: 24 },
        children: (tabConfig.layout.sections || []).map((s: any) => ({
          id: generateId(), type: 'section' as const, label: s.title, props: { title: s.title },
          children: (s.fields || []).map((f: any) => ({
            id: generateId(), type: 'field' as const, label: f.label, props: f, dataKey: f.key,
          })),
        })),
      };
    }
    return { id: generateId(), type: 'container', props: { label: '容器' }, style: { padding: 16 }, children: [] };
  }, []);

  const toTabConfig = useCallback((): any | null => {
    if (!state.rootComponent) return null;
    const extractFields = (c: CanvasComponent): any[] => {
      if (c.type === 'field' && c.dataKey) return [c.props];
      return (c.children || []).flatMap(extractFields);
    };
    return { layout: { type: 'form', fields: extractFields(state.rootComponent) } };
  }, [state.rootComponent]);

  return {
    ...state,
    setRootComponent,
    selectComponent,
    hoverComponent,
    addComponent,
    removeComponent,
    updateComponent,
    moveComponent: (_id: string, _targetParentId: string, _targetIndex: number) => {},
    setDraggingComponent,
    setResizing,
    undo,
    redo,
    fromTabConfig,
    toTabConfig,
    clearCanvas,
  };
}

/** 创建组件实例 */
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

/** 查找组件 */
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

/** 获取组件路径 */
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
