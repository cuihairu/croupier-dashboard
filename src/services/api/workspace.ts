/**
 * Workspace API 兼容层
 *
 * 统一委托到 services/workspaceConfig，避免重复契约。
 */

import type { WorkspaceConfig } from '@/types/workspace';
import {
  cloneWorkspaceConfig as cloneConfig,
  deleteWorkspaceConfig as deleteConfig,
  exportWorkspaceConfig as exportConfig,
  importWorkspaceConfig as importConfig,
  listWorkspaceConfigs as listConfigs,
  loadWorkspaceConfig,
  saveWorkspaceConfig as saveConfig,
} from '@/services/workspaceConfig';

export async function getWorkspaceConfig(objectKey: string): Promise<WorkspaceConfig> {
  const config = await loadWorkspaceConfig(objectKey, { forceRefresh: true, useCache: false });
  if (!config) {
    throw new Error(`配置不存在: ${objectKey}`);
  }
  return config;
}

export async function saveWorkspaceConfig(config: WorkspaceConfig): Promise<WorkspaceConfig> {
  return saveConfig(config);
}

export async function deleteWorkspaceConfig(objectKey: string): Promise<void> {
  return deleteConfig(objectKey);
}

export async function listWorkspaceConfigs(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<{
  data: WorkspaceConfig[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 50;
  const search = (params?.search || '').trim().toLowerCase();

  const rows = await listConfigs();
  const filtered = search
    ? rows.filter(
        (item) =>
          item.objectKey.toLowerCase().includes(search) ||
          item.title.toLowerCase().includes(search),
      )
    : rows;

  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    data: filtered.slice(start, end),
    total: filtered.length,
    page,
    pageSize,
  };
}

export async function cloneWorkspaceConfig(
  sourceKey: string,
  targetKey: string,
  targetTitle: string,
): Promise<WorkspaceConfig> {
  return cloneConfig(sourceKey, targetKey, targetTitle);
}

export async function exportWorkspaceConfig(objectKey: string): Promise<string> {
  return exportConfig(objectKey);
}

export async function importWorkspaceConfig(
  configJson: string,
  _overwrite = false,
): Promise<WorkspaceConfig> {
  return importConfig(configJson);
}
