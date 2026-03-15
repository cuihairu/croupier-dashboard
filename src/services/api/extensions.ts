import { request } from '@umijs/max';

const BASE = '/api/v1/extensions';

export type ExtensionCatalogItem = {
  id: string;
  name: string;
  display_name: string;
  vendor: string;
  kind: string;
  summary: string;
  icon_url: string;
  status: string;
  latest_version: string;
  installed: boolean;
  default_install: boolean;
  tags: string[];
};

export type ExtensionReleaseItem = {
  version: string;
  release_channel: string;
  min_core_version: string;
  published_at: number;
  changelog: string;
};

export type ExtensionInstallationItem = {
  id: number;
  installation_key: string;
  extension_id: string;
  display_name: string;
  release_version: string;
  scope_type: string;
  scope_id: string;
  target_type: string;
  target_id: string;
  status: string;
  desired_state: string;
  enabled: boolean;
  health_status: string;
  last_error: string;
  updated_at: number;
};

export type ExtensionBindingItem = {
  binding_type: string;
  binding_key: string;
  target_ref: string;
  status: string;
  last_error: string;
};

export type ExtensionEventItem = {
  event_type: string;
  level: string;
  message: string;
  payload: string;
  created_by: string;
  created_at: number;
};

export type ExtensionCatalogListParams = {
  keyword?: string;
  kind?: string;
  status?: string;
  page?: number;
  page_size?: number;
};

export type ExtensionInstallationListParams = {
  extension_id?: string;
  scope_type?: string;
  scope_id?: string;
  target_type?: string;
  target_id?: string;
  status?: string;
  enabled?: boolean;
  page?: number;
  page_size?: number;
};

export type ExtensionInstallRequest = {
  extension_id: string;
  release_version: string;
  scope_type: string;
  scope_id: string;
  target_type: string;
  target_id?: string;
  config?: Record<string, any>;
  secret_refs?: Record<string, string>;
};

export async function listExtensionCatalog(params?: ExtensionCatalogListParams) {
  return request<{ code: number; message: string; total: number; items: ExtensionCatalogItem[] }>(
    `${BASE}/catalog`,
    { params },
  );
}

export async function getExtensionCatalogDetail(id: string) {
  return request<{
    code: number;
    message: string;
    item?: ExtensionCatalogItem;
    releases?: ExtensionReleaseItem[];
    manifest?: Record<string, any>;
    capabilities?: string[];
  }>(`${BASE}/catalog/${encodeURIComponent(id)}`);
}

export async function listExtensionCatalogReleases(id: string) {
  return request<{
    code: number;
    message: string;
    total: number;
    releases: ExtensionReleaseItem[];
  }>(`${BASE}/catalog/${encodeURIComponent(id)}/releases`);
}

export async function listExtensionInstallations(params?: ExtensionInstallationListParams) {
  return request<{
    code: number;
    message: string;
    total: number;
    items: ExtensionInstallationItem[];
  }>(`${BASE}/installations`, { params });
}

export async function installExtension(data: ExtensionInstallRequest) {
  return request<{ code: number; message: string; installation_id: number; status: string }>(
    `${BASE}/install`,
    { method: 'POST', data },
  );
}

export async function getExtensionInstallationDetail(id: number) {
  return request<{
    code: number;
    message: string;
    installation?: ExtensionInstallationItem;
    config_schema?: Record<string, any>;
    config?: Record<string, any>;
    secret_refs?: Record<string, string>;
    bindings?: ExtensionBindingItem[];
    events?: ExtensionEventItem[];
  }>(`${BASE}/installations/${id}`);
}

export async function updateExtensionConfig(
  id: number,
  data: { config?: Record<string, any>; secret_refs?: Record<string, string> },
) {
  return request<{ code: number; message: string; status: string }>(
    `${BASE}/installations/${id}/config`,
    {
      method: 'PUT',
      data,
    },
  );
}

export async function getExtensionConfigSchema(id: number) {
  return request<{ code: number; message: string; schema: Record<string, any> }>(
    `${BASE}/installations/${id}/config-schema`,
  );
}

export async function getExtensionConfig(id: number) {
  return request<{
    code: number;
    message: string;
    config: Record<string, any>;
    secret_refs: Record<string, string>;
  }>(`${BASE}/installations/${id}/config`);
}

export async function testExtensionConnection(id: number) {
  return request<{ code: number; message: string; status: string }>(
    `${BASE}/installations/${id}/test-connection`,
    { method: 'POST' },
  );
}

export async function getExtensionCapabilities(id: number) {
  return request<{ code: number; message: string; capabilities: string[] }>(
    `${BASE}/installations/${id}/capabilities`,
  );
}

export async function runExtensionHealthCheck(id: number) {
  return request<{ code: number; message: string; status: string; checked_at: number }>(
    `${BASE}/installations/${id}/health-check`,
    { method: 'POST' },
  );
}

export async function enableExtension(id: number) {
  return request<{ code: number; message: string; status: string }>(
    `${BASE}/installations/${id}/enable`,
    { method: 'POST' },
  );
}

export async function disableExtension(id: number) {
  return request<{ code: number; message: string; status: string }>(
    `${BASE}/installations/${id}/disable`,
    { method: 'POST' },
  );
}

export async function upgradeExtension(id: number, releaseVersion: string) {
  return request<{ code: number; message: string; status: string }>(
    `${BASE}/installations/${id}/upgrade`,
    {
      method: 'POST',
      data: { release_version: releaseVersion },
    },
  );
}

export async function reconcileExtension(id: number) {
  return request<{
    code: number;
    message: string;
    status: string;
    applied: number;
    failed: number;
  }>(`${BASE}/installations/${id}/reconcile`, { method: 'POST' });
}

export async function uninstallExtension(id: number) {
  return request<{ code: number; message: string; status: string }>(`${BASE}/installations/${id}`, {
    method: 'DELETE',
  });
}

export async function listExtensionEvents(
  id: number,
  params?: { level?: string; keyword?: string; page?: number; page_size?: number },
) {
  return request<{ code: number; message: string; total: number; items: ExtensionEventItem[] }>(
    `${BASE}/installations/${id}/events`,
    { params },
  );
}

export async function getAgentSyncPayload(agentId: string) {
  return request<{ code: number; message: string; payload: any }>(
    `${BASE}/agents/${encodeURIComponent(agentId)}/sync-payload`,
  );
}

export async function listExtensionPages(id: string | number) {
  return request<{
    code: number;
    message: string;
    items?: Array<{
      id?: string;
      title?: string;
      path?: string;
      icon?: string;
      order?: number;
      category?: string;
      extension_id?: string;
    }>;
  }>(`${BASE}/${encodeURIComponent(String(id))}/pages`);
}
