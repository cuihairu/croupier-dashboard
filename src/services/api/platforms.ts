import { request } from '@umijs/max';

const BASE = '/api/v1/platforms';

export interface PlatformInfo {
  name: string;
  enabled: boolean;
  methods: string[];
}

export interface CallPlatformRequest {
  platform: string;
  method: string;
  request: string;
}

export interface CallPlatformResponse {
  code: number;
  message: string;
  response?: any;
}

// 获取所有平台列表
export async function listPlatforms() {
  return request<{ code: number; message: string; platforms: PlatformInfo[] }>(BASE);
}

// 获取指定平台支持的方法列表
export async function listPlatformMethods(platformName: string) {
  return request<{ code: number; message: string; methods: string[] }>(`${BASE}/${platformName}/methods`);
}

// 调用第三方平台 API
export async function callPlatform(data: CallPlatformRequest) {
  return request<CallPlatformResponse>(`${BASE}/call`, {
    method: 'POST',
    data,
  });
}

// 重新加载平台配置
export async function reloadPlatformConfig() {
  return request<{ code: number; message: string; success: boolean }>(`${BASE}/reload`, {
    method: 'POST',
  });
}
