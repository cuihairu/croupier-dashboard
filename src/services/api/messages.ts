import { request } from '@umijs/max';
import { createEventSource } from '../core/http';

export type MessageItem = {
  id: number;
  title: string;
  content: string;
  type?: string;
  created_at: string;
  read: boolean;
  kind?: 'direct' | 'broadcast';
};

export async function unreadCount() {
  // avoid request when no token present
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  if (!token) return { count: 0 } as any;
  return request<{ count: number }>('/api/v1/messages/unread-count');
}

export async function listMessages(params?: {
  status?: 'unread' | 'all';
  page?: number;
  size?: number;
  pageSize?: number;
}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  if (!token)
    return { messages: [], total: 0, page: params?.page || 1, size: params?.size || 10 } as any;
  return request<{ messages: MessageItem[]; total: number; page: number; size: number }>(
    '/api/v1/messages',
    {
      params: {
        status: params?.status,
        page: params?.page,
        pageSize: params?.pageSize || params?.size,
      },
    },
  );
}

export async function markMessagesRead(ids: number[], options?: { broadcast_ids?: number[] }) {
  if (!ids || ids.length === 0) return;
  await Promise.all(
    ids.map((id) => request<void>(`/api/v1/messages/${id}/read`, { method: 'POST' })),
  );
  // 广播消息的已读标记在当前后端契约中未单独提供批量接口，先忽略 broadcast_ids。
  void options;
}

// Admin only
export async function sendMessage(body: {
  to_username?: string;
  to_user_id?: number;
  title: string;
  content: string;
  type?: string;
}) {
  return request<{ id: number }>('/api/v1/messages', { method: 'POST', data: body });
}

export function openMessagesStream() {
  return createEventSource('/api/v1/messages/stream');
}
