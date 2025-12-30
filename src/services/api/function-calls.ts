import { request } from '@umijs/max';

export type FunctionCall = {
  id: string;
  function_id: string;
  user?: string;
  status: 'success' | 'failed' | 'running' | 'cancelled';
  started_at: string;
  completed_at?: string;
  duration?: number;
  payload?: any;
  result?: any;
  error?: string;
  agent_id?: string;
  game_id?: string;
  env?: string;
  job_id?: string;
};

export async function listFunctionCalls(params: {
  limit?: number;
  function_id?: string;
  user_id?: string;
  game_id?: string;
}) {
  return request<{ calls?: FunctionCall[] }>('/api/function_calls', { params });
}

export async function rerunFunctionCall(callId: string) {
  return request<void>(`/api/function_calls/${encodeURIComponent(callId)}/rerun`, { method: 'POST' });
}

