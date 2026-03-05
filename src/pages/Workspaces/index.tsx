import { history, useModel } from '@umijs/max';
import { Alert, Card, List, Spin } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { listDescriptors, type FunctionDescriptor } from '@/services/api';
import { buildWorkspaceObjects } from '@/features/workspaces/model';

export default function WorkspacesIndexPage() {
  const [loading, setLoading] = useState(false);
  const [descriptors, setDescriptors] = useState<FunctionDescriptor[]>([]);
  const [error, setError] = useState('');
  const { initialState } = useModel('@@initialState');

  useEffect(() => {
    const boot = ((initialState as any)?.functionDescriptors || []) as FunctionDescriptor[];
    if (Array.isArray(boot) && boot.length > 0) {
      setDescriptors(boot);
      return;
    }
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await listDescriptors();
        if (!mounted) return;
        setDescriptors(Array.isArray(rows) ? rows : []);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || '加载对象工作台失败');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load().catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const workspaces = useMemo(() => buildWorkspaceObjects(descriptors), [descriptors]);

  useEffect(() => {
    if (loading) return;
    if (workspaces.length > 0) {
      history.replace(`/system/functions/workspaces/${encodeURIComponent(workspaces[0].key)}`);
    }
  }, [loading, workspaces]);

  if (loading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  if (error) {
    return <Alert type="error" message={error} showIcon />;
  }

  if (workspaces.length === 0) {
    return <Alert type="info" message="暂无可用对象工作台" showIcon />;
  }

  return (
    <Card title="对象工作台">
      <List
        dataSource={workspaces}
        renderItem={(item) => (
          <List.Item
            style={{ cursor: 'pointer' }}
            onClick={() =>
              history.push(`/system/functions/workspaces/${encodeURIComponent(item.key)}`)
            }
          >
            {item.name} ({item.operations.length})
          </List.Item>
        )}
      />
    </Card>
  );
}
