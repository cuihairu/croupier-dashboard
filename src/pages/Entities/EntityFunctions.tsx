import React, { useEffect, useState } from 'react';
import { useParams } from '@umijs/max';
import { getEntityFunctions } from '@/services/api';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Tag, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface EntityFunction {
  id: string;
  operation: string;
  name: string;
}

const EntityFunctions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [functions, setFunctions] = useState<EntityFunction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadEntityFunctions = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const response = await getEntityFunctions(id);
      setFunctions(response.items || []);
    } catch (err: any) {
      console.error('Failed to load entity functions:', err);
      setError(err?.message || 'Failed to load entity functions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntityFunctions();
  }, [id]);

  const getOperationTag = (operation: string) => {
    const colors: Record<string, string> = {
      create: 'green',
      read: 'blue',
      update: 'orange',
      delete: 'red',
      custom: 'purple',
    };
    return colors[operation] || 'default';
  };

  const columns: ColumnsType<EntityFunction> = [
    {
      title: 'Function ID',
      dataIndex: 'id',
      key: 'id',
      width: 300,
      fixed: 'left' as const,
    },
    {
      title: 'Operation Type',
      dataIndex: 'operation',
      key: 'operation',
      width: 150,
      render: (operation: string) => (
        <Tag color={getOperationTag(operation)}>{operation.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
  ];

  return (
    <PageContainer
      title="Entity Functions"
      content={
        <div style={{ padding: 24 }}>
          <Card>
            {error && (
              <Alert
                type="error"
                message={error}
                showIcon
                closable
                style={{ marginBottom: 16 }}
              />
            )}
            <Table
              columns={columns}
              dataSource={functions}
              rowKey="id"
              loading={loading}
              pagination={false}
              scroll={{ x: 800 }}
            />
          </Card>
        </div>
      }
    />
  );
};

export default EntityFunctions;
