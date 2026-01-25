import { request } from '@umijs/max';

export async function uploadAsset(file: File) {
  const form = new FormData();
  form.append('file', file);
  return request<{ Key: string; URL: string }>('/api/v1/storage/signed-url', {
    method: 'POST',
    data: form,
  });
}

export async function listObjects(params: {
  prefix?: string;
  marker?: string;
  limit?: number;
  delimiter?: string;
}) {
  return request('/api/v1/storage/objects', { params });
}

export async function uploadObject(file: File) {
  const form = new FormData();
  form.append('file', file);
  return request('/api/v1/storage/objects', {
    method: 'POST',
    data: form,
  });
}

export async function deleteObject(key: string) {
  return request('/api/v1/storage/objects', {
    method: 'DELETE',
    data: { key },
  });
}

export async function batchDeleteObjects(keys: string[]) {
  return request('/api/v1/storage/objects/batch-delete', {
    method: 'POST',
    data: { keys },
  });
}
