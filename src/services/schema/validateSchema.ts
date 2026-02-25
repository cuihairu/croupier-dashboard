export interface SchemaValidationResult {
  ok: boolean;
  error?: string;
}

export function validateFormilySchema(schema: any): SchemaValidationResult {
  if (!schema || typeof schema !== 'object') {
    return { ok: false, error: 'Schema 不能为空且必须为对象' };
  }
  if (!schema.type) {
    return { ok: false, error: 'Schema 缺少 type 字段' };
  }
  return { ok: true };
}
