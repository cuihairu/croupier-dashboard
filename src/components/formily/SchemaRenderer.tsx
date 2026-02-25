import React, { useEffect, useMemo, useRef } from 'react';
import type { Form as FormilyForm } from '@formily/core';
import { createForm, onFormValuesChange } from '@formily/core';
import { createSchemaField } from '@formily/react';
import {
  Form as FormilyFormLayout,
  FormItem,
  Input,
  NumberPicker,
  Select,
  Switch,
  DatePicker,
  ArrayTable,
  ArrayItems,
  Space,
  Card,
  Checkbox,
  Radio,
  PreviewText,
} from '@formily/antd-v5';
import { Empty } from 'antd';
import FormilyProvider from './FormilyProvider';
import { FormilyContextProvider, type FormilyRuntimeContext } from './context';
import type { FormilySchema } from './schema/types';

interface SchemaRendererProps {
  schema?: FormilySchema;
  value?: Record<string, any>;
  readOnly?: boolean;
  onChange?: (values: Record<string, any>) => void;
  scope?: Record<string, any>;
  context?: FormilyRuntimeContext;
  effects?: (form: FormilyForm) => void;
}

const SchemaField = createSchemaField({
  components: {
    FormItem,
    Input,
    NumberPicker,
    Select,
    Switch,
    DatePicker,
    ArrayTable,
    ArrayItems,
    Space,
    Card,
    Checkbox,
    Radio,
  },
});

export default function SchemaRenderer({ schema, value, readOnly, onChange, scope, context, effects }: SchemaRendererProps) {
  const formRef = useRef<FormilyForm | null>(null);
  const form = useMemo(() => {
    if (formRef.current) return formRef.current;
    const created = createForm({
      readPretty: !!readOnly,
      values: value || {},
      effects: (formInstance) => {
        if (effects) effects(formInstance);
      },
    });
    formRef.current = created;
    return created;
  }, [readOnly, value]);

  useEffect(() => {
    form.setValues(value || {}, 'overwrite');
  }, [form, value]);

  useEffect(() => {
    form.setState((state) => {
      state.readPretty = !!readOnly;
    });
  }, [form, readOnly]);

  useEffect(() => {
    if (!onChange) return undefined;
    const effectId = `schema-renderer:${Date.now()}`;
    form.addEffects(effectId, () => {
      onFormValuesChange((next) => {
        onChange(next.values as Record<string, any>);
      });
    });
    return () => form.removeEffects(effectId);
  }, [form, onChange]);

  useEffect(() => {
    if (!schema || !scope?.fetchOptions) return;
    const tasks: Array<{ path: string; source: any }> = [];
    const walk = (node: any, path: string) => {
      if (!node || typeof node !== 'object') return;
      if (node['x-data-source']) {
        tasks.push({ path, source: node['x-data-source'] });
      }
      if (node.properties) {
        Object.keys(node.properties).forEach((key) => {
          walk(node.properties[key], path ? `${path}.${key}` : key);
        });
      }
    };
    walk(schema, '');
    if (tasks.length === 0) return;
    tasks.forEach(async ({ path, source }) => {
      try {
        const url = typeof source === 'string' ? source : source?.url;
        if (!url) return;
        const params = typeof source === 'object' ? source?.params : undefined;
        const options = await scope.fetchOptions(url, params);
        form.setFieldState(path, (state) => {
          state.componentProps = { ...(state.componentProps || {}), options };
        });
      } catch {
        // ignore async option errors
      }
    });
  }, [form, schema, scope]);

  if (!schema || typeof schema !== 'object') {
    return <Empty description="暂无可渲染的 Schema" />;
  }

  return (
    <FormilyContextProvider value={context || {}}>
      <FormilyProvider form={form}>
        <FormilyFormLayout layout="vertical" form={form}>
          <SchemaField schema={schema} scope={scope} />
          {readOnly && <PreviewText />}
        </FormilyFormLayout>
      </FormilyProvider>
    </FormilyContextProvider>
  );
}
