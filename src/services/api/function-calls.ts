import { request } from '@umijs/max';

export type FunctionCallItem = {
  id: number;
  job_id: string;
  function_id: string;
  game_id?: string;
  env?: string;
  actor_id?: string;
  actor_type?: string;
  status: string;
  agent_id?: string;
  service_id?: string;
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
  payload?: any;
  result?: any;
  error_msg?: string;
  retry_count?: number;
  created_at: string;
};

export type FunctionCallsListResponse = {
  calls: FunctionCallItem[];
  total: number;
  page: number;
  page_size: number;
};

export type FunctionCallStatsResponse = {
  total: number;
  succeeded: number;
  failed: number;
  running: number;
  cancelled: number;
  timeout: number;
  other: number;
  avg_duration_ms: number;
};

export type FunctionCallsListParams = {
  function_id?: string;
  game_id?: string;
  env?: string;
  status?: string;
  actor_id?: string;
  agent_id?: string;
  start_time?: string;
  end_time?: string;
  page?: number;
  page_size?: number;
};

/**
 * 获取函数调用历史列表
 */
export async function listFunctionCalls(params: FunctionCallsListParams = {}) {
  return request<FunctionCallsListResponse>('/api/v1/function-calls', {
    params,
  });
}

/**
 * 获取单条调用历史详情
 */
export async function getFunctionCallDetail(id: string) {
  return request<{ FunctionCallItem }>(`/api/v1/function-calls/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

/**
 * 重新执行失败的调用
 */
export async function rerunFunctionCall(id: string, payload?: any) {
  return request<{ job_id: string }>(`/api/v1/function-calls/${encodeURIComponent(id)}/rerun`, {
    method: 'POST',
    data: { payload },
  });
}

/**
 * 获取调用统计
 */
export async function getFunctionCallStats(params: {
  function_id?: string;
  game_id?: string;
  env?: string;
  actor_id?: string;
  start_time?: string;
  end_time?: string;
} = {}) {
  return request<FunctionCallStatsResponse>('/api/v1/function-calls/stats', {
    params,
  });
}
