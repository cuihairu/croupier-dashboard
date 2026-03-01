import type { FormilySchemaDoc, FormilySchemaVersion } from '@/components/formily/schema/types';
import { fetchFunctionUiSchema, saveFunctionUiSchema } from '@/services/api/functions';
import { convertLegacySchemaToFormily } from './convertLegacySchemaToFormily';

const VERSION: FormilySchemaVersion = 'formily:1';

function draftKey(functionId: string) {
  return `function:ui-schema:draft:${functionId}`;
}

function nowISO() {
  return new Date().toISOString();
}

export async function fetchFormilySchema(functionId: string): Promise<FormilySchemaDoc | null> {
  const res = await fetchFunctionUiSchema(functionId);
  if (!res?.schema) return null;
  const normalized = convertLegacySchemaToFormily(res.schema);
  return {
    functionId,
    version: VERSION,
    schema: normalized,
    updatedAt: res.updated_at || undefined,
    status: 'published',
  } as FormilySchemaDoc;
}

export async function saveFormilySchema(functionId: string, schema: any): Promise<void> {
  await saveFunctionUiSchema(functionId, { schema });
}

export function loadDraft(functionId: string): FormilySchemaDoc | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(draftKey(functionId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      functionId,
      version: VERSION,
      schema: parsed?.schema || {},
      updatedAt: parsed?.updatedAt || undefined,
      status: 'draft',
    };
  } catch {
    return null;
  }
}

export function saveDraft(functionId: string, schema: any) {
  if (typeof window === 'undefined') return;
  const doc: FormilySchemaDoc = {
    functionId,
    version: VERSION,
    schema,
    updatedAt: nowISO(),
    status: 'draft',
  };
  localStorage.setItem(draftKey(functionId), JSON.stringify(doc));
}

export function clearDraft(functionId: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(draftKey(functionId));
}
