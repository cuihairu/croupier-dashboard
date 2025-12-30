import { request } from '@umijs/max';

export type PendingFunctionRow = {
  function_id: string;
  display_name?: { zh?: string; en?: string };
  summary?: { zh?: string; en?: string };
  suggested_permissions?: { verbs?: string[]; scopes?: string[] };
};

export async function listPendingFunctions() {
  const res = await request<{ pending?: PendingFunctionRow[] }>('/api/admin/pending', { method: 'GET' });
  return res?.pending || [];
}

export async function publishPendingFunction(functionId: string) {
  return request<void>(`/api/admin/functions/${encodeURIComponent(functionId)}/publish`, { method: 'POST' });
}

export async function getAdminFunctionPermissions(functionId: string) {
  const res = await request<{ permissions?: any }>(
    `/api/admin/functions/${encodeURIComponent(functionId)}/permissions`,
    { method: 'GET' },
  );
  return res?.permissions || {};
}

export async function setAdminFunctionPermissions(functionId: string, permissions: any) {
  return request<void>(`/api/admin/functions/${encodeURIComponent(functionId)}/permissions`, {
    method: 'PUT',
    data: permissions,
  });
}
