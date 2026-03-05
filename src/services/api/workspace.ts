/**
 * Workspace 配置管理 API 客户端
 */

import { request } from '@umijs/max';
import type { WorkspaceConfig } from '@/types/workspace';

const API_PREFIX = '/api/v1/workspaces';

/**
 * 获取 Workspace 配置
 */
export async function getWorkspaceConfig(objectKey: string): Promise<WorkspaceConfig> {
  return request(`${API_PREFIX}/${encodeURIComponent(objectKey)}/config`, {
    method: 'GET',
  });
}

/**
 * 保存 Workspace 配置
 */
export async function saveWorkspaceConfig(config: WorkspaceConfig): Promise<WorkspaceConfig> {
  return request(`${API_PREFIX}/${encodeURIComponent(config.objectKey)}/config`, {
    method: 'PUT',
    data: config,
  });
}

/**
 * 删除 Workspace 配置
 */
export async function deleteWorkspaceConfig(objectKey: string): Promise<void> {
  return request(`${API_PREFIX}/${encodeURIComponent(objectKey)}/config`, {
    method: 'DELETE',
  });
}

/**
 * 获取配置列表
 */
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
  return request(`${API_PREFIX}/configs`, {
    method: 'GET',
    params,
  });
}

/**
 * 克隆配置
 */
export async function cloneWorkspaceConfig(
  sourceKey: string,
  targetKey: string,
  targetTitle: string,
): Promise<WorkspaceConfig> {
  return request(`${API_PREFIX}/${encodeURIComponent(sourceKey)}/clone`, {
    method: 'POST',
    data: {
      targetKey,
      targetTitle,
    },
  });
}

/**
 * 导出配置
 */
export async function exportWorkspaceConfig(objectKey: string): Promise<string> {
  const result = await request<WorkspaceConfig>(
    `${API_PREFIX}/${encodeURIComponent(objectKey)}/export`,
    {
      method: 'GET',
    },
  );
  return JSON.stringify(result, null, 2);
}

/**
 * 导入配置
 */
export async function importWorkspaceConfig(
  configJson: string,
  overwrite = false,
): Promise<WorkspaceConfig> {
  const config = JSON.parse(configJson);
  return request(`${API_PREFIX}/import`, {
    method: 'POST',
    data: {
      config,
      overwrite,
    },
  });
}
