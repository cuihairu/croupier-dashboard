export type DynamicMenuItem = {
  key: string;
  name: string;
  path?: string;
  locale: false;
  children?: DynamicMenuItem[];
  routes?: DynamicMenuItem[];
};

export type WorkspaceVisibleItem = {
  nodes: string[];
  id: string;
  name: string;
  category: string;
  order: number;
  path: string;
};

type BuildWorkspaceItemsOptions = {
  visible: WorkspaceVisibleItem[];
  preferZh: boolean;
  localizeFreeText: (value?: string) => string;
  localizeToken: (value?: string) => string;
  sanitizeNodeKey: (raw?: string) => string;
  maxObjects?: number;
  fallbackPath?: string;
};

export function buildWorkspaceItems(opts: BuildWorkspaceItemsOptions): DynamicMenuItem[] {
  const {
    visible,
    preferZh,
    localizeFreeText,
    localizeToken,
    sanitizeNodeKey,
    maxObjects = 24,
    fallbackPath = '/console',
  } = opts;

  type WorkspaceGroup = {
    key: string;
    name: string;
    order: number;
    items: Array<{
      id: string;
      name: string;
      path: string;
      order: number;
    }>;
  };

  const groups = new Map<string, WorkspaceGroup>();
  const sorted = [...visible].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  sorted.forEach((it) => {
    const nodes = (it.nodes || []).filter(Boolean);
    const primary = sanitizeNodeKey(nodes[0] || it.category || 'general') || 'general';
    const groupName =
      localizeFreeText(primary) || localizeToken(primary) || (preferZh ? '未分组' : 'Ungrouped');
    const key = `workspace-group-${primary}`;
    const current = groups.get(key) || {
      key,
      name: groupName,
      order: it.order,
      items: [],
    };
    current.order = Math.min(current.order, it.order);
    current.items.push({
      id: it.id,
      name: it.name,
      path: it.path,
      order: it.order,
    });
    groups.set(key, current);
  });

  return Array.from(groups.values())
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .slice(0, maxObjects)
    .map<DynamicMenuItem>((group) => {
      const sortedItems = [...group.items].sort(
        (a, b) => a.order - b.order || a.name.localeCompare(b.name),
      );
      const primary = String(group.key).replace(/^workspace-group-/, '');
      const groupPath = `/console/${encodeURIComponent(primary)}`;
      return {
        key: `workspace-object-${group.key}`,
        name: `${group.name} (${group.items.length})`,
        path: sortedItems.length > 0 ? groupPath : fallbackPath,
        locale: false,
      };
    });
}

export function injectWorkspaceMenu(items: any[], workspaceItems: DynamicMenuItem[]): any[] {
  return (items || []).map((it: any) => {
    const children = it.children || it.routes;
    const patchedChildren = Array.isArray(children)
      ? injectWorkspaceMenu(children, workspaceItems)
      : children;
    const out = {
      ...it,
      ...(Array.isArray(children) ? { children: patchedChildren, routes: patchedChildren } : {}),
    };
    if (out.path === '/console') {
      const existing = Array.isArray(out.children) ? out.children : [];
      const filtered = existing.filter(
        (child: any) => !String(child?.key || '').startsWith('workspace-object-'),
      );
      out.children = [...workspaceItems, ...filtered];
      out.routes = [...workspaceItems, ...filtered];
    }
    return out;
  });
}
