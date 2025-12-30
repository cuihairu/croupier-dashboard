import { request } from '@umijs/max';

export type LegacyDescriptor = Record<string, any> & { id?: string };

function normalizeDescriptorArray(input: any): LegacyDescriptor[] {
  if (Array.isArray(input)) return input;
  if (input && typeof input === 'object') {
    return Object.entries(input).map(([id, desc]) => ({ id, ...(desc as any) }));
  }
  return [];
}

function normalizeDescriptorMap(input: any): Record<string, LegacyDescriptor> {
  if (input && typeof input === 'object' && !Array.isArray(input)) return input as any;
  const m: Record<string, LegacyDescriptor> = {};
  if (Array.isArray(input)) {
    input.forEach((d: any) => {
      const id = d?.id;
      if (id) m[id] = d;
    });
  }
  return m;
}

export async function fetchLegacyDescriptorsRaw() {
  return request<any>('/api/descriptors');
}

export async function listLegacyDescriptors() {
  const raw = await fetchLegacyDescriptorsRaw();
  return normalizeDescriptorArray(raw);
}

export async function getLegacyDescriptorsMap() {
  const raw = await fetchLegacyDescriptorsRaw();
  return normalizeDescriptorMap(raw);
}

