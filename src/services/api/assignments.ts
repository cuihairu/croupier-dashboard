import { request } from '@umijs/max';

export async function fetchAssignments(params?: { game_id?: string; env?: string }) {
  return request<{ assignments: Record<string, string[]> }>('/api/v1/assignments', { params });
}

export async function setAssignments(params: {
  game_id: string;
  env?: string;
  action?: 'assign' | 'clone' | 'remove' | string;
  functions: string[];
}) {
  return request<{ ok: boolean; unknown?: string[] }>('/api/v1/assignments', {
    method: 'PUT',
    data: params,
  });
}

export type AssignmentHistoryItem = {
  id: string;
  game_id: string;
  env: string;
  function_id: string;
  action: string;
  count: number;
  operated_by: string;
  operated_at: string;
  details?: Record<string, any>;
};

export async function fetchAssignmentsHistory(params?: {
  game_id?: string;
  env?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}) {
  return request<{
    items: AssignmentHistoryItem[];
    total: number;
    page: number;
    pageSize: number;
  }>('/api/v1/assignments/history', { params });
}
