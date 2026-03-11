/**
 * 预览配置联动管理
 *
 * 管理预览区和配置区之间的双向高亮联动。
 *
 * @module pages/WorkspaceEditor/utils/previewConfigLink
 */

import { create } from 'zustand';

/** 高亮目标类型 */
export type HighlightTargetType =
  | 'field' // 字段
  | 'column' // 列
  | 'section' // 分区
  | 'tab' // Tab
  | 'function'; // 函数绑定

/** 高亮目标 */
export interface HighlightTarget {
  type: HighlightTargetType;
  key: string; // 目标唯一标识
  tabKey?: string; // 所属 Tab
  layoutType?: string; // 布局类型
  path?: string[]; // 字段路径（用于嵌套字段）
}

/** 高亮状态 */
interface HighlightState {
  /** 当前高亮的目标 */
  activeTarget: HighlightTarget | null;
  /** 高亮开始时间（用于自动清除） */
  highlightStartTime: number;
  /** 高亮持续时间（毫秒） */
  highlightDuration: number;
}

interface HighlightActions {
  /** 设置高亮 */
  setHighlight: (target: HighlightTarget, duration?: number) => void;
  /** 清除高亮 */
  clearHighlight: () => void;
  /** 从预览区触发的配置区高亮 */
  highlightConfig: (target: HighlightTarget) => void;
  /** 从配置区触发的预览区高亮 */
  highlightPreview: (target: HighlightTarget) => void;
}

/**
 * 高亮联动 Store
 */
const useHighlightStore = create<HighlightState & HighlightActions>((set) => ({
  activeTarget: null,
  highlightStartTime: 0,
  highlightDuration: 2000,

  setHighlight: (target, duration = 2000) => {
    set({
      activeTarget: target,
      highlightStartTime: Date.now(),
      highlightDuration: duration,
    });

    // 自动清除高亮
    setTimeout(() => {
      set((state) => {
        if (Date.now() - state.highlightStartTime >= state.highlightDuration) {
          return { activeTarget: null, highlightStartTime: 0, highlightDuration: 2000 };
        }
        return state;
      });
    }, duration);
  },

  clearHighlight: () =>
    set({
      activeTarget: null,
      highlightStartTime: 0,
      highlightDuration: 2000,
    }),

  highlightConfig: (target) => {
    set({
      activeTarget: { ...target, source: 'preview' },
      highlightStartTime: Date.now(),
      highlightDuration: 2000,
    });

    // 触发自定义事件，让配置区滚动到目标位置
    window.dispatchEvent(
      new CustomEvent('config-highlight', {
        detail: target,
      }),
    );
  },

  highlightPreview: (target) => {
    set({
      activeTarget: { ...target, source: 'config' },
      highlightStartTime: Date.now(),
      highlightDuration: 2000,
    });

    // 触发自定义事件，让预览区高亮对应元素
    window.dispatchEvent(
      new CustomEvent('preview-highlight', {
        detail: target,
      }),
    );
  },
}));

export { useHighlightStore };

/**
 * 生成字段路径的 CSS 选择器
 */
export function getFieldSelector(target: HighlightTarget): string {
  const parts = [target.tabKey ? `[data-tab="${target.tabKey}"]` : ''];

  switch (target.type) {
    case 'field':
      parts.push(`[data-field-key="${target.key}"]`);
      break;
    case 'column':
      parts.push(`[data-column-key="${target.key}"]`);
      break;
    case 'section':
      parts.push(`[data-section-key="${target.key}"]`);
      break;
    case 'tab':
      parts.push(`[data-tab-key="${target.key}"]`);
      break;
    case 'function':
      parts.push(`[data-function-key="${target.key}"]`);
      break;
  }

  return parts.join(' ');
}

/**
 * 生成配置项的唯一标识
 */
export function getConfigItemKey(target: HighlightTarget): string {
  const parts = [target.type];

  if (target.tabKey) {
    parts.push(target.tabKey);
  }

  parts.push(target.key);

  return parts.join(':');
}

/**
 * 解析配置项唯一标识
 */
export function parseConfigItemKey(key: string): HighlightTarget | null {
  const parts = key.split(':');

  if (parts.length < 2) return null;

  const type = parts[0] as HighlightTargetType;
  const targetKey = parts[parts.length - 1];
  const tabKey = parts.length > 2 ? parts[1] : undefined;

  return { type, key: targetKey, tabKey };
}

/**
 * 高亮样式类名
 */
export const HIGHLIGHT_CLASS = 'config-highlight-active';
export const PREVIEW_HIGHLIGHT_CLASS = 'preview-highlight-active';

/**
 * 获取高亮样式
 */
export function getHighlightStyles(type: 'config' | 'preview'): React.CSSProperties {
  if (type === 'config') {
    return {
      backgroundColor: '#fff1b8',
      boxShadow: '0 0 0 2px #faad14',
      animation: 'config-pulse 1.5s ease-in-out 2',
    };
  }

  return {
    outline: '2px solid #1890ff',
    outlineOffset: 2,
    boxShadow: '0 0 8px rgba(24, 144, 255, 0.5)',
    transition: 'all 0.3s',
  };
}

/**
 * 注入全局高亮样式
 */
export function injectHighlightStyles(): void {
  if (document.getElementById('config-highlight-styles')) return;

  const style = document.createElement('style');
  style.id = 'config-highlight-styles';
  style.textContent = `
    @keyframes config-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .${HIGHLIGHT_CLASS} {
      animation: config-pulse 1.5s ease-in-out 2;
    }

    .${PREVIEW_HIGHLIGHT_CLASS} {
      position: relative;
      z-index: 10;
    }

    .${PREVIEW_HIGHLIGHT_CLASS}::after {
      content: '';
      position: absolute;
      inset: -4px;
      border: 2px solid #1890ff;
      border-radius: 4px;
      pointer-events: none;
      animation: preview-pulse 1s ease-in-out 2;
    }

    @keyframes preview-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;

  document.head.appendChild(style);
}

// 初始化时注入样式
if (typeof window !== 'undefined') {
  injectHighlightStyles();
}
