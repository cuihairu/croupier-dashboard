import type { WorkspaceOperation } from './model';

export type WorkspaceLayoutMode = 'single' | 'tabbed';

export type WorkspaceLayoutConfig = {
  mode: WorkspaceLayoutMode;
  order: string[];
  hidden: string[];
  sections: Array<{
    key: string;
    title: string;
    operations: string[];
  }>;
};

const STORAGE_PREFIX = 'workspace_layout:';

export function defaultWorkspaceLayout(operations: WorkspaceOperation[]): WorkspaceLayoutConfig {
  const ids = operations.map((op) => op.id);
  return {
    mode: 'single',
    order: ids,
    hidden: [],
    sections: [
      {
        key: 'default',
        title: '默认分组',
        operations: ids,
      },
    ],
  };
}

export function loadWorkspaceLayout(
  objectKey: string,
  operations: WorkspaceOperation[],
): WorkspaceLayoutConfig {
  if (typeof window === 'undefined') return defaultWorkspaceLayout(operations);
  const fallback = defaultWorkspaceLayout(operations);
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${objectKey}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<WorkspaceLayoutConfig>;
    const validIds = new Set(operations.map((op) => op.id));
    const order = Array.isArray(parsed.order) ? parsed.order.filter((id) => validIds.has(id)) : [];
    const hidden = Array.isArray(parsed.hidden)
      ? parsed.hidden.filter((id) => validIds.has(id))
      : [];
    const mergedOrder = [
      ...order,
      ...operations.map((op) => op.id).filter((id) => !order.includes(id)),
    ];
    const rawSections = Array.isArray(parsed.sections) ? parsed.sections : [];
    const sections = rawSections
      .map((section) => ({
        key: String((section as any)?.key || '').trim(),
        title: String((section as any)?.title || '').trim(),
        operations: Array.isArray((section as any)?.operations)
          ? (section as any).operations.filter((id: string) => validIds.has(id))
          : [],
      }))
      .filter((section) => section.key && section.title);
    if (sections.length === 0) {
      sections.push({
        key: 'default',
        title: '默认分组',
        operations: mergedOrder,
      });
    } else {
      const allocated = new Set(sections.flatMap((section) => section.operations));
      const rest = mergedOrder.filter((id) => !allocated.has(id));
      if (rest.length > 0) {
        sections[0].operations = [...sections[0].operations, ...rest];
      }
    }
    return {
      mode: parsed.mode === 'tabbed' ? 'tabbed' : 'single',
      order: mergedOrder,
      hidden,
      sections,
    };
  } catch {
    return fallback;
  }
}

export function saveWorkspaceLayout(objectKey: string, layout: WorkspaceLayoutConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${objectKey}`, JSON.stringify(layout));
  } catch {
    // ignore persist errors
  }
}
