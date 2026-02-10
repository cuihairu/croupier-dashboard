import { request } from '@umijs/max';
import { createEventSource } from '../core/http';

export type FunctionDescriptor = {
  id: string;
  type?: 'function' | 'entity';  // Type of descriptor: function or entity
  version?: string;
  category?: string;
  description?: string;
  display_name?: { zh?: string; en?: string };
  summary?: { zh?: string; en?: string };
  tags?: string[];
  menu?: {
    section?: string;
    group?: string;
    path?: string;
    order?: number;
    icon?: string;
    badge?: string;
    hidden?: boolean;
  };
  params?: any;
  auth?: Record<string, any>;
  // Optional outputs schema for UI rendering (views/layout); present in generated descriptors
  outputs?: any;
  // Entity-specific fields
  schema?: any;
  operations?: any;
  ui?: any;
  // OpenAPI 3.0.3 Schema fields (JSON Schema format, stringified)
  input_schema?: string;   // JSON Schema for request body (from proto)
  output_schema?: string;  // JSON Schema for response body (from proto)
};

export type FunctionPermission = {
  resource: string;
  actions: string[];
  roles: string[];
  gameId?: string;
  env?: string;
};

export async function listDescriptors() {
  return request<FunctionDescriptor[]>('/api/v1/functions/descriptors');
}

export async function invokeFunction(
  function_id: string,
  payload: any,
  opts?: {
    route?: 'lb' | 'broadcast' | 'targeted' | 'hash';
    target_service_id?: string;
    hash_key?: string;
    game_id?: string;
    env?: string;
  },
) {
  const data: any = { function_id, payload };
  const game_id = opts?.game_id ?? (typeof window !== 'undefined' ? localStorage.getItem('game_id') || undefined : undefined);
  const env = opts?.env ?? (typeof window !== 'undefined' ? localStorage.getItem('env') || undefined : undefined);
  if (game_id) data.game_id = game_id;
  if (env) data.env = env;
  if (opts?.route) data.route = opts.route;
  if (opts?.target_service_id) data.target_service_id = opts.target_service_id;
  if (opts?.hash_key) data.hash_key = opts.hash_key;
  return request<any>(`/api/v1/functions/${encodeURIComponent(function_id)}/invoke`, { method: 'POST', data });
}

export async function startJob(
  function_id: string,
  payload: any,
  opts?: {
    route?: 'lb' | 'broadcast' | 'targeted' | 'hash';
    target_service_id?: string;
    hash_key?: string;
    game_id?: string;
    env?: string;
  },
) {
  const data: any = { function_id, payload };
  const game_id = opts?.game_id ?? (typeof window !== 'undefined' ? localStorage.getItem('game_id') || undefined : undefined);
  const env = opts?.env ?? (typeof window !== 'undefined' ? localStorage.getItem('env') || undefined : undefined);
  if (game_id) data.game_id = game_id;
  if (env) data.env = env;
  if (opts?.route) data.route = opts.route;
  if (opts?.target_service_id) data.target_service_id = opts.target_service_id;
  if (opts?.hash_key) data.hash_key = opts.hash_key;
  return request<{ job_id: string }>(`/api/v1/functions/${encodeURIComponent(function_id)}/invoke?mode=job`, { method: 'POST', data });
}

export async function cancelJob(job_id: string) {
  return request<void>('/api/v1/jobs/cancel', { method: 'POST', data: { id: job_id } });
}

export async function fetchJobResult(id: string) {
  return request<{ state: string; payload?: any; error?: string }>(`/api/v1/jobs/${id}/result`, { method: 'GET' });
}

export async function listFunctionInstances(params: { game_id?: string; function_id: string }) {
  return request<{ instances: { agent_id: string; service_id: string; addr: string; version: string }[] }>(
    `/api/v1/functions/${encodeURIComponent(params.function_id)}/instances`,
    { params },
  );
}

export async function fetchFunctionUiSchema(functionId: string) {
  return request<{ uiSchema?: any; uischema?: any }>(`/api/v1/functions/${encodeURIComponent(functionId)}/ui`, { method: 'GET' });
}

export async function getFunctionPermissions(functionId: string) {
  return request<{ items?: FunctionPermission[] }>(`/api/v1/functions/${encodeURIComponent(functionId)}/permissions`, {
    method: 'GET',
  });
}

export async function updateFunctionPermissions(functionId: string, permissions: FunctionPermission[]) {
  return request<{ items?: FunctionPermission[] }>(`/api/v1/functions/${encodeURIComponent(functionId)}/permissions`, {
    method: 'PUT',
    data: { permissions },
  });
}

export function openJobEventSource(jobId: string) {
  return createEventSource(`/api/v1/jobs/${jobId}/stream`);
}

// Batch operations
export async function updateFunctionStatus(functionId: string, data: { enabled: boolean }) {
  return request<void>(`/api/v1/functions/${encodeURIComponent(functionId)}/status`, {
    method: 'PUT',
    data,
  });
}

export async function batchUpdateFunctions(data: { function_ids: string[]; enabled: boolean }) {
  return request<{ updated: number; failed: string[] }>('/api/v1/functions/batch-update', {
    method: 'POST',
    data,
  });
}

export async function copyFunction(functionId: string) {
  return request<{ function_id: string; new_id: string }>(`/api/v1/functions/${encodeURIComponent(functionId)}/copy`, {
    method: 'POST',
  });
}

export async function deleteFunction(functionId: string) {
  return request<void>(`/api/v1/functions/${encodeURIComponent(functionId)}`, {
    method: 'DELETE',
  });
}

export async function getFunctionDetail(functionId: string) {
  return request<FunctionDescriptor>(`/api/v1/functions/${encodeURIComponent(functionId)}`);
}

export async function getFunctionHistory(functionId: string) {
  return request<Array<{
    id: string;
    action: string;
    operator?: string;
    timestamp: string;
    details?: any;
  }>>(`/api/v1/functions/${encodeURIComponent(functionId)}/history`);
}

export async function getFunctionAnalytics(functionId: string) {
  return request<{
    totalCalls: number;
    successRate: number;
    avgLatency: number;
    callsToday: number;
    callsThisWeek: number;
    callsThisMonth: number;
  }>(`/api/v1/functions/${encodeURIComponent(functionId)}/analytics`);
}

export async function updateFunction(functionId: string, data: {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  enabled?: boolean;
}) {
  return request<void>(`/api/v1/functions/${encodeURIComponent(functionId)}`, {
    method: 'PUT',
    data,
  });
}

/**
 * OpenAPI 3.0.3 相关类型定义
 */
export type OpenAPIOperation = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: any[];
  requestBody?: any;
  responses?: any;
  extensions?: Record<string, any>;
};

/**
 * 获取函数的 OpenAPI 3.0.3 规范
 * @param functionId 函数 ID
 * @returns OpenAPI Operation Object
 */
export async function getFunctionOpenAPI(functionId: string) {
  return request<OpenAPIOperation>(`/api/v1/functions/${encodeURIComponent(functionId)}/openapi`);
}

/**
 * 导入 OpenAPI 3.0.3 规范
 * @param spec OpenAPI 3.0.3 Document
 * @returns 导入结果
 */
export async function importOpenAPISpec(spec: any) {
  return request<{
    imported: number;
    failed: string[];
  }>('/api/v1/functions/_import', {
    method: 'POST',
    data: { spec },
  });
}
