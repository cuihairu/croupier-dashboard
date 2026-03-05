import type { FunctionDescriptor } from '@/services/api';

export type WorkspaceOperation = {
  id: string;
  name: string;
  path: string;
  order: number;
  objectKey: string;
  operationKey: string;
};

export type WorkspaceObject = {
  key: string;
  name: string;
  operations: WorkspaceOperation[];
};

const sanitizeKey = (raw?: string) =>
  String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/[_\-.]{2,}/g, '_')
    .replace(/^[_\-.]+|[_\-.]+$/g, '');

const toReadable = (raw: string) =>
  raw
    .split(/[_\-.]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

function resolveObjectKey(d: FunctionDescriptor): string {
  const nodes = Array.isArray(d.menu?.nodes) ? d.menu!.nodes! : [];
  const fromNodes = sanitizeKey(nodes[0]);
  if (fromNodes) return fromNodes;
  const fromEntity = sanitizeKey((d as any)?.entity);
  if (fromEntity) return fromEntity;
  const fromCategory = sanitizeKey(d.category);
  if (fromCategory) return fromCategory;
  const fromId = sanitizeKey(String(d.id || '').split('.')[0]);
  return fromId || 'general';
}

function resolveOperationKey(d: FunctionDescriptor): string {
  const op = sanitizeKey((d as any)?.operation);
  if (op) return op;
  const tail = sanitizeKey(
    String(d.id || '')
      .split('.')
      .slice(-1)[0],
  );
  return tail || 'custom';
}

function resolveName(d: FunctionDescriptor): string {
  return (
    d.display_name?.zh ||
    d.display_name?.en ||
    (d as any)?.operation_display?.zh ||
    (d as any)?.operation_display?.en ||
    d.id
  );
}

export function buildWorkspaceObjects(descriptors: FunctionDescriptor[]): WorkspaceObject[] {
  const grouped = new Map<string, WorkspaceObject>();
  const visible = (descriptors || []).filter((d) => d && d.id && !(d.menu && d.menu.hidden));

  visible.forEach((d) => {
    const objectKey = resolveObjectKey(d);
    const operationKey = resolveOperationKey(d);
    const objectName =
      (d as any)?.entity_display?.zh ||
      (d as any)?.entity_display?.en ||
      (d as any)?.entity ||
      toReadable(objectKey);
    const current: WorkspaceObject = grouped.get(objectKey) || {
      key: objectKey,
      name: objectName || toReadable(objectKey),
      operations: [],
    };
    current.operations.push({
      id: d.id,
      name: resolveName(d),
      path: `/system/functions/invoke?fid=${encodeURIComponent(d.id)}`,
      order: typeof d.menu?.order === 'number' ? d.menu!.order! : 100,
      objectKey,
      operationKey,
    });
    grouped.set(objectKey, current);
  });

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      operations: group.operations.sort(
        (a, b) => a.order - b.order || a.name.localeCompare(b.name),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
