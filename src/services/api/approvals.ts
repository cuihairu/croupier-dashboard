import { request } from '@umijs/max';

export type ApprovalRow = {
  ID: string;
  CreatedAt: string;
  Actor: string;
  FunctionID: string;
  GameID?: string;
  Env?: string;
  State: 'pending' | 'approved' | 'rejected';
  Mode: 'invoke' | 'start_job';
  Route?: string;
  ApproveIP?: string;
  ApproveTime?: string;
  RejectIP?: string;
  RejectTime?: string;
  IdempotencyKey?: string;
  TargetServiceID?: string;
  HashKey?: string;
};

export async function listApprovals(params: Record<string, any>) {
  return request<{ approvals?: ApprovalRow[]; total?: number }>('/api/approvals', { params });
}

export async function getApproval(id: string) {
  return request<any>('/api/approvals/get', { params: { id } });
}

export async function approveApproval(data: { id: string; otp?: string }) {
  return request<void>('/api/approvals/approve', { method: 'POST', data });
}

export async function rejectApproval(data: { id: string; reason: string }) {
  return request<void>('/api/approvals/reject', { method: 'POST', data });
}

