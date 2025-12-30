import { request } from '@umijs/max';
import { buildDownloadUrl } from '../core/http';

export async function listPacks() {
  return request<{ manifest: any; counts: { descriptors: number; ui_schema: number }; etag?: string; export_auth_required?: boolean }>('/api/v1/packs');
}

export async function reloadPacks() {
  return request<{ ok: boolean }>('/api/v1/packs/reload', { method: 'POST' });
}

export function getPacksExportUrl() {
  return buildDownloadUrl('/api/packs/export');
}

export function buildPackPluginUrl(params: { pack: string; path: string; v?: string; token?: string }) {
  return buildDownloadUrl('/api/v1/packs/plugin', params);
}
