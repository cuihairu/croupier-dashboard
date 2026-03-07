/**
 * Workspace 配置服务
 *
 * 提供 Workspace 配置的加载、保存、缓存等功能。
 *
 * @module services/workspaceConfig
 */

import type { WorkspaceConfig } from '@/types/workspace';
import { request } from '@umijs/max';
import {
  mockLoadWorkspaceConfig,
  mockSaveWorkspaceConfig,
  mockListWorkspaceConfigs,
  mockDeleteWorkspaceConfig,
  mockPublishWorkspaceConfig,
  mockUnpublishWorkspaceConfig,
  mockListPublishedWorkspaceConfigs,
} from './mock/workspaceMock';

// Workspace 配置接口后端已实现
const USE_MOCK = false;

/**
 * 配置缓存
 *
 * 使用 Map 缓存配置，减少 API 调用。
 */
const configCache = new Map<string, WorkspaceConfig>();

/**
 * 缓存过期时间（毫秒）
 */
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

export interface WorkspacePublishResult {
  published: boolean;
  objectKey: string;
}

/**
 * 缓存时间戳
 */
const cacheTimestamps = new Map<string, number>();

/**
 * 检查缓存是否过期
 */
function isCacheExpired(objectKey: string): boolean {
  const timestamp = cacheTimestamps.get(objectKey);
  if (!timestamp) return true;
  return Date.now() - timestamp > CACHE_TTL;
}

/**
 * 设置缓存
 */
function setCache(objectKey: string, config: WorkspaceConfig): void {
  configCache.set(objectKey, config);
  cacheTimestamps.set(objectKey, Date.now());
}

/**
 * 获取缓存
 */
function getCache(objectKey: string): WorkspaceConfig | undefined {
  if (isCacheExpired(objectKey)) {
    configCache.delete(objectKey);
    cacheTimestamps.delete(objectKey);
    return undefined;
  }
  return configCache.get(objectKey);
}

/**
 * 清除缓存
 */
function clearCache(objectKey?: string): void {
  if (objectKey) {
    configCache.delete(objectKey);
    cacheTimestamps.delete(objectKey);
  } else {
    configCache.clear();
    cacheTimestamps.clear();
  }
}

/**
 * 加载 Workspace 配置
 *
 * @param objectKey - 对象标识
 * @param options - 加载选项
 * @returns Workspace 配置
 */
export async function loadWorkspaceConfig(
  objectKey: string,
  options?: {
    /** 是否强制刷新（跳过缓存） */
    forceRefresh?: boolean;
    /** 是否使用缓存 */
    useCache?: boolean;
  },
): Promise<WorkspaceConfig | null> {
  const { forceRefresh = false, useCache = true } = options || {};

  // 检查缓存
  if (useCache && !forceRefresh) {
    const cached = getCache(objectKey);
    if (cached) {
      return cached;
    }
  }

  try {
    // 如果使用 Mock 数据
    if (USE_MOCK) {
      const config = await mockLoadWorkspaceConfig(objectKey);
      if (useCache && config) {
        setCache(objectKey, config);
      }
      return config;
    }

    // 调用 API 加载配置（后端直接返回 WorkspaceConfig，因为 response embeds WorkspaceConfig）
    const config = await request<WorkspaceConfig | null>(`/api/v1/workspaces/${objectKey}/config`, {
      method: 'GET',
    });

    // 设置缓存
    if (useCache && config) {
      setCache(objectKey, config);
    }

    return config;
  } catch (error: any) {
    // 如果是 404，返回 null（配置不存在）
    if (error.response?.status === 404) {
      return null;
    }
    // 其他错误抛出
    throw error;
  }
}

/**
 * 保存 Workspace 配置
 *
 * @param config - Workspace 配置
 * @returns 保存后的配置
 */
export async function saveWorkspaceConfig(config: WorkspaceConfig): Promise<WorkspaceConfig> {
  try {
    // 如果使用 Mock 数据
    if (USE_MOCK) {
      const savedConfig = await mockSaveWorkspaceConfig(config);
      setCache(config.objectKey, savedConfig);
      return savedConfig;
    }

    // 调用 API 保存配置（后端直接返回 WorkspaceConfig，因为 response embeds WorkspaceConfig）
    const savedConfig = await request<WorkspaceConfig>(
      `/api/v1/workspaces/${config.objectKey}/config`,
      {
        method: 'PUT',
        data: config,
      },
    );

    if (!savedConfig) {
      throw new Error('Failed to save workspace config');
    }

    // 更新缓存
    setCache(config.objectKey, savedConfig);

    return savedConfig;
  } catch (error) {
    throw error;
  }
}

/**
 * 获取 Workspace 配置列表
 *
 * @returns 配置列表
 */
export async function listWorkspaceConfigs(): Promise<WorkspaceConfig[]> {
  try {
    // 如果使用 Mock 数据
    if (USE_MOCK) {
      const configs = await mockListWorkspaceConfigs();
      configs.forEach((config) => {
        setCache(config.objectKey, config);
      });
      return configs;
    }

    const response = await request<{ items: WorkspaceConfig[] }>('/api/v1/workspaces/configs', {
      method: 'GET',
    });

    // 后端返回 { items: [...] } 结构，提取数组
    const configs = Array.isArray(response?.items) ? response.items : [];

    // 更新缓存
    configs.forEach((config) => {
      setCache(config.objectKey, config);
    });

    return configs;
  } catch (error) {
    throw error;
  }
}

/**
 * 删除 Workspace 配置
 *
 * @param objectKey - 对象标识
 */
export async function deleteWorkspaceConfig(objectKey: string): Promise<void> {
  try {
    // 如果使用 Mock 数据
    if (USE_MOCK) {
      await mockDeleteWorkspaceConfig(objectKey);
      clearCache(objectKey);
      return;
    }

    await request(`/api/v1/workspaces/${objectKey}/config`, {
      method: 'DELETE',
    });

    // 清除缓存
    clearCache(objectKey);
  } catch (error) {
    throw error;
  }
}

/**
 * 发布 Workspace 配置
 */
export async function publishWorkspaceConfig(objectKey: string): Promise<WorkspacePublishResult> {
  if (USE_MOCK) {
    const config = await mockPublishWorkspaceConfig(objectKey);
    setCache(objectKey, config);
    return { published: true, objectKey };
  }
  const response = await request<WorkspacePublishResult>(
    `/api/v1/workspaces/${objectKey}/publish`,
    {
      method: 'POST',
    },
  );
  // 清除缓存以便下次加载时获取最新状态
  clearCache(objectKey);
  return response;
}

/**
 * 取消发布 Workspace 配置
 */
export async function unpublishWorkspaceConfig(objectKey: string): Promise<WorkspacePublishResult> {
  if (USE_MOCK) {
    const config = await mockUnpublishWorkspaceConfig(objectKey);
    setCache(objectKey, config);
    return { published: false, objectKey };
  }
  const response = await request<WorkspacePublishResult>(
    `/api/v1/workspaces/${objectKey}/unpublish`,
    {
      method: 'POST',
    },
  );
  // 清除缓存以便下次加载时获取最新状态
  clearCache(objectKey);
  return response;
}

/**
 * 获取已发布的 Workspace 列表（控制台用）
 */
export async function listPublishedWorkspaceConfigs(): Promise<WorkspaceConfig[]> {
  if (USE_MOCK) {
    return mockListPublishedWorkspaceConfigs();
  }
  const response = await request<{ items: WorkspaceConfig[] }>('/api/v1/workspaces/published', {
    method: 'GET',
  });
  return Array.isArray(response?.items) ? response.items : [];
}

/**
 * 验证 Workspace 配置
 *
 * @param config - Workspace 配置
 * @returns 验证结果
 */
export function validateWorkspaceConfig(config: WorkspaceConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 验证必填字段
  if (!config.objectKey) {
    errors.push('objectKey 不能为空');
  }

  if (!config.title) {
    errors.push('title 不能为空');
  }

  if (!config.layout) {
    errors.push('layout 不能为空');
  }

  // 验证布局
  if (config.layout) {
    if (!config.layout.type) {
      errors.push('layout.type 不能为空');
    }

    if (config.layout.type === 'tabs') {
      if (!config.layout.tabs || config.layout.tabs.length === 0) {
        errors.push('tabs 布局至少需要一个 tab');
      }

      // 验证每个 tab
      config.layout.tabs?.forEach((tab, index) => {
        if (!tab.key) {
          errors.push(`tabs[${index}].key 不能为空`);
        }
        if (!tab.title) {
          errors.push(`tabs[${index}].title 不能为空`);
        }
        if (!tab.layout) {
          errors.push(`tabs[${index}].layout 不能为空`);
        }
        if (!tab.layout?.type) {
          errors.push(`tabs[${index}].layout.type 不能为空`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 克隆 Workspace 配置
 *
 * @param sourceKey - 源对象标识
 * @param targetKey - 目标对象标识
 * @param targetTitle - 目标标题
 * @returns 克隆后的配置
 */
export async function cloneWorkspaceConfig(
  sourceKey: string,
  targetKey: string,
  targetTitle: string,
): Promise<WorkspaceConfig> {
  // 加载源配置
  const sourceConfig = await loadWorkspaceConfig(sourceKey);
  if (!sourceConfig) {
    throw new Error(`配置不存在: ${sourceKey}`);
  }

  // 创建新配置
  const newConfig: WorkspaceConfig = {
    ...sourceConfig,
    objectKey: targetKey,
    title: targetTitle,
    meta: {
      ...sourceConfig.meta,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  // 保存新配置
  return saveWorkspaceConfig(newConfig);
}

/**
 * 导出 Workspace 配置
 *
 * @param objectKey - 对象标识
 * @returns 配置 JSON 字符串
 */
export async function exportWorkspaceConfig(objectKey: string): Promise<string> {
  const config = await loadWorkspaceConfig(objectKey);
  if (!config) {
    throw new Error(`配置不存在: ${objectKey}`);
  }

  return JSON.stringify(config, null, 2);
}

/**
 * 导入 Workspace 配置
 *
 * @param configJson - 配置 JSON 字符串
 * @returns 导入后的配置
 */
export async function importWorkspaceConfig(configJson: string): Promise<WorkspaceConfig> {
  try {
    const config = JSON.parse(configJson) as WorkspaceConfig;

    // 验证配置
    const validation = validateWorkspaceConfig(config);
    if (!validation.valid) {
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }

    // 保存配置
    return saveWorkspaceConfig(config);
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      throw new Error('配置 JSON 格式错误');
    }
    throw error;
  }
}

/**
 * 清除所有缓存
 */
export function clearAllCache(): void {
  clearCache();
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
} {
  return {
    size: configCache.size,
    keys: Array.from(configCache.keys()),
  };
}

/**
 * 预加载配置
 *
 * 在后台预加载配置，提升用户体验。
 *
 * @param objectKeys - 对象标识列表
 */
export async function preloadConfigs(objectKeys: string[]): Promise<void> {
  const promises = objectKeys.map((key) => loadWorkspaceConfig(key).catch(() => null));
  await Promise.all(promises);
}

/**
 * 批量加载配置
 *
 * @param objectKeys - 对象标识列表
 * @returns 配置映射
 */
export async function batchLoadConfigs(
  objectKeys: string[],
): Promise<Map<string, WorkspaceConfig | null>> {
  const results = await Promise.all(
    objectKeys.map(async (key) => {
      const config = await loadWorkspaceConfig(key).catch(() => null);
      return [key, config] as [string, WorkspaceConfig | null];
    }),
  );

  return new Map(results);
}
