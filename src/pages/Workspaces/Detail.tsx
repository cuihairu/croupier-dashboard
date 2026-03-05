import { history, useModel, useParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Popconfirm,
  message,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { invokeFunction, listDescriptors, type FunctionDescriptor } from '@/services/api';
import { buildWorkspaceObjects } from '@/features/workspaces/model';
import {
  defaultWorkspaceLayout,
  loadWorkspaceLayout,
  saveWorkspaceLayout,
  type WorkspaceLayoutConfig,
} from '@/features/workspaces/layout';

const buildExamplePayload = (operationKey: string, objectKey: string) => {
  const op = String(operationKey || '').toLowerCase();
  if (op.includes('create') || op.includes('add') || op.includes('new')) {
    return { id: `${objectKey}-001`, name: 'example', enabled: true };
  }
  if (op.includes('update') || op.includes('edit') || op.includes('patch')) {
    return { id: `${objectKey}-001`, patch: { name: 'updated-name' } };
  }
  if (op.includes('delete') || op.includes('remove')) {
    return { id: `${objectKey}-001` };
  }
  if (op.includes('list') || op.includes('query') || op.includes('search')) {
    return { page: 1, page_size: 20 };
  }
  if (op.includes('get') || op.includes('read') || op.includes('detail')) {
    return { id: `${objectKey}-001` };
  }
  return {};
};

export default function WorkspaceDetailPage() {
  const params = useParams<{ objectKey: string }>();
  const objectKey = decodeURIComponent(String(params?.objectKey || '')).toLowerCase();
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
  const workspace = useMemo(
    () => workspaces.find((item) => item.key.toLowerCase() === objectKey),
    [workspaces, objectKey],
  );
  const [payloadMap, setPayloadMap] = useState<Record<string, string>>({});
  const [invoking, setInvoking] = useState<string>('');
  const [resultMap, setResultMap] = useState<Record<string, string>>({});
  const [layout, setLayout] = useState<WorkspaceLayoutConfig>({
    mode: 'single',
    order: [],
    hidden: [],
    sections: [],
  });
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [editingSectionKey, setEditingSectionKey] = useState('');
  const [editingSectionTitle, setEditingSectionTitle] = useState('');
  const [draggingOperationId, setDraggingOperationId] = useState('');
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    if (!workspace) return;
    setLayout(loadWorkspaceLayout(workspace.key, workspace.operations));
  }, [workspace]);

  const orderedOperations = useMemo(() => {
    if (!workspace) return [];
    const byId = new Map(workspace.operations.map((op) => [op.id, op]));
    return layout.order.map((id) => byId.get(id)).filter(Boolean) as typeof workspace.operations;
  }, [layout.order, workspace]);

  const visibleOperations = useMemo(
    () => orderedOperations.filter((op) => !layout.hidden.includes(op.id)),
    [orderedOperations, layout.hidden],
  );
  const tabSections = useMemo(() => {
    const byId = new Map(visibleOperations.map((op) => [op.id, op]));
    const sections = (layout.sections || [])
      .map((section) => ({
        ...section,
        ops: (section.operations || [])
          .map((id) => byId.get(id))
          .filter(Boolean) as typeof visibleOperations,
      }))
      .filter((section) => section.ops.length > 0);
    if (sections.length > 0) return sections;
    return [
      {
        key: 'default',
        title: '默认分组',
        operations: visibleOperations.map((op) => op.id),
        ops: visibleOperations,
      },
    ];
  }, [layout.sections, visibleOperations]);

  if (!objectKey) return <Alert type="error" message="对象标识无效" showIcon />;
  if (loading) return <Card loading />;
  if (error) return <Alert type="error" message={error} showIcon />;
  if (!workspace) return <Empty description="对象不存在或暂无可执行操作" />;

  const runQuickInvoke = async (functionId: string) => {
    const raw = payloadMap[functionId] || '{}';
    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch {
      message.error('请求体 JSON 格式无效');
      return;
    }
    setInvoking(functionId);
    try {
      const resp = await invokeFunction(functionId, payload);
      setResultMap((prev) => ({ ...prev, [functionId]: JSON.stringify(resp ?? {}, null, 2) }));
      message.success('执行成功');
    } catch (error: any) {
      const detail = error?.message || '执行失败';
      setResultMap((prev) => ({
        ...prev,
        [functionId]: JSON.stringify({ error: detail }, null, 2),
      }));
      message.error(detail);
    } finally {
      setInvoking('');
    }
  };

  const updateLayout = (updater: (prev: WorkspaceLayoutConfig) => WorkspaceLayoutConfig) => {
    setLayout((prev) => {
      const next = updater(prev);
      saveWorkspaceLayout(workspace.key, next);
      return next;
    });
  };

  const moveOperation = (id: string, direction: -1 | 1) => {
    updateLayout((prev) => {
      const index = prev.order.indexOf(id);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.order.length) return prev;
      const order = [...prev.order];
      [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
      return { ...prev, order };
    });
  };

  const toggleOperationVisible = (id: string) => {
    updateLayout((prev) => {
      const hidden = prev.hidden.includes(id)
        ? prev.hidden.filter((item) => item !== id)
        : [...prev.hidden, id];
      return { ...prev, hidden };
    });
  };

  const resetLayout = () => {
    const next = defaultWorkspaceLayout(workspace.operations);
    setLayout(next);
    saveWorkspaceLayout(workspace.key, next);
  };

  const addSection = () => {
    const title = newSectionTitle.trim();
    if (!title) return;
    const key = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (!key) return;
    updateLayout((prev) => {
      if ((prev.sections || []).some((section) => section.key === key)) return prev;
      return {
        ...prev,
        sections: [...(prev.sections || []), { key, title, operations: [] }],
      };
    });
    setNewSectionTitle('');
  };

  const startEditSection = (key: string, title: string) => {
    setEditingSectionKey(key);
    setEditingSectionTitle(title);
  };

  const saveEditSection = () => {
    const title = editingSectionTitle.trim();
    if (!title || !editingSectionKey) return;
    updateLayout((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((section) =>
        section.key === editingSectionKey ? { ...section, title } : section,
      ),
    }));
    setEditingSectionKey('');
    setEditingSectionTitle('');
  };

  const deleteSection = (sectionKey: string) => {
    updateLayout((prev) => {
      const sections = [...(prev.sections || [])];
      if (sections.length <= 1) return prev;
      const target = sections.find((section) => section.key === sectionKey);
      if (!target) return prev;
      const rest = sections.filter((section) => section.key !== sectionKey);
      const fallback = rest[0];
      fallback.operations = [...target.operations, ...fallback.operations];
      return { ...prev, sections: rest };
    });
  };

  const moveSection = (sectionKey: string, direction: -1 | 1) => {
    updateLayout((prev) => {
      const sections = [...(prev.sections || [])];
      const index = sections.findIndex((section) => section.key === sectionKey);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= sections.length) return prev;
      [sections[index], sections[nextIndex]] = [sections[nextIndex], sections[index]];
      return { ...prev, sections };
    });
  };

  const assignSection = (operationId: string, sectionKey: string) => {
    updateLayout((prev) => {
      const sections = (prev.sections || []).map((section) => ({
        ...section,
        operations: section.operations.filter((id) => id !== operationId),
      }));
      const target = sections.find((section) => section.key === sectionKey);
      if (!target) return prev;
      target.operations.push(operationId);
      return { ...prev, sections };
    });
  };

  const moveOperationTo = (operationId: string, targetOperationId: string) => {
    if (!operationId || !targetOperationId || operationId === targetOperationId) return;
    updateLayout((prev) => {
      const from = prev.order.indexOf(operationId);
      const to = prev.order.indexOf(targetOperationId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev.order];
      next.splice(from, 1);
      next.splice(to, 0, operationId);
      return { ...prev, order: next };
    });
  };

  const renderOperationCard = (op: (typeof workspace.operations)[number]) => (
    <Card
      key={op.id}
      size="small"
      title={op.name}
      extra={<Typography.Text type="secondary">{op.operationKey}</Typography.Text>}
    >
      <Typography.Paragraph style={{ marginBottom: 8 }}>
        操作 ID：<Typography.Text code>{op.id}</Typography.Text>
      </Typography.Paragraph>
      <Input.TextArea
        rows={4}
        value={payloadMap[op.id] ?? '{\n  \n}'}
        onChange={(event) =>
          setPayloadMap((prev) => ({
            ...prev,
            [op.id]: event.target.value,
          }))
        }
      />
      <Space style={{ marginTop: 8 }}>
        <Button
          onClick={() =>
            setPayloadMap((prev) => ({
              ...prev,
              [op.id]: JSON.stringify(buildExamplePayload(op.operationKey, workspace.key), null, 2),
            }))
          }
        >
          填充示例参数
        </Button>
        <Button type="primary" loading={invoking === op.id} onClick={() => runQuickInvoke(op.id)}>
          快速执行
        </Button>
        <Button onClick={() => history.push(op.path)}>打开完整执行页</Button>
      </Space>
      {resultMap[op.id] ? (
        <pre
          style={{
            marginTop: 12,
            maxHeight: 260,
            overflow: 'auto',
            background: '#fafafa',
            border: '1px solid #f0f0f0',
            padding: 12,
          }}
        >
          {resultMap[op.id]}
        </pre>
      ) : null}
    </Card>
  );

  const sectionOptions = (layout.sections || []).map((section) => ({
    label: section.title,
    value: section.key,
  }));

  return (
    <Card
      title={`对象工作台 · ${workspace.name}`}
      extra={
        <Button onClick={() => history.push('/system/functions/workspaces')} type="link">
          切换对象
        </Button>
      }
    >
      {showGuide ? (
        <Alert
          type="info"
          showIcon
          closable
          onClose={() => setShowGuide(false)}
          message="使用说明：先编排，再执行"
          description={
            <Space direction="vertical" size={2}>
              <span>1) 在“编排控制”里调整顺序、分组、显隐。</span>
              <span>2) 选“单页/Tab”查看布局效果。</span>
              <span>3) 在操作卡片填 JSON，点“快速执行”看结果。</span>
              <span>4) 不清楚参数就先点“填充示例参数”。</span>
            </Space>
          }
          style={{ marginBottom: 12 }}
        />
      ) : null}
      <Space wrap style={{ marginBottom: 12 }}>
        <Tag color={layout.mode === 'single' ? 'blue' : 'default'}>单页编排</Tag>
        <Button
          type={layout.mode === 'single' ? 'primary' : 'default'}
          size="small"
          onClick={() => updateLayout((prev) => ({ ...prev, mode: 'single' }))}
        >
          单页
        </Button>
        <Button
          type={layout.mode === 'tabbed' ? 'primary' : 'default'}
          size="small"
          onClick={() => updateLayout((prev) => ({ ...prev, mode: 'tabbed' }))}
        >
          Tab
        </Button>
        <Button size="small" onClick={resetLayout}>
          重置编排
        </Button>
      </Space>
      <Card size="small" title="编排控制" style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Input
              size="small"
              placeholder="新分组名称"
              value={newSectionTitle}
              onChange={(event) => setNewSectionTitle(event.target.value)}
              style={{ width: 180 }}
            />
            <Button size="small" onClick={addSection}>
              新增分组
            </Button>
            <Typography.Text type="secondary">支持拖拽操作行排序</Typography.Text>
          </Space>
          {(layout.sections || []).map((section, sectionIndex) => {
            const count = (section.operations || []).filter((id) =>
              orderedOperations.some((op) => op.id === id),
            ).length;
            return (
              <Space
                key={section.key}
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  borderBottom: '1px dashed #f0f0f0',
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (!draggingOperationId) return;
                  assignSection(draggingOperationId, section.key);
                  setDraggingOperationId('');
                }}
              >
                <Space>
                  {editingSectionKey === section.key ? (
                    <>
                      <Input
                        size="small"
                        value={editingSectionTitle}
                        onChange={(event) => setEditingSectionTitle(event.target.value)}
                        style={{ width: 180 }}
                      />
                      <Button size="small" type="primary" onClick={saveEditSection}>
                        保存
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setEditingSectionKey('');
                          setEditingSectionTitle('');
                        }}
                      >
                        取消
                      </Button>
                    </>
                  ) : (
                    <>
                      <Typography.Text strong>{section.title}</Typography.Text>
                      <Tag>{count}</Tag>
                      <Typography.Text type="secondary">可拖入操作</Typography.Text>
                    </>
                  )}
                </Space>
                {editingSectionKey !== section.key ? (
                  <Space>
                    <Button
                      size="small"
                      onClick={() => moveSection(section.key, -1)}
                      disabled={sectionIndex === 0}
                    >
                      上移
                    </Button>
                    <Button
                      size="small"
                      onClick={() => moveSection(section.key, 1)}
                      disabled={sectionIndex === (layout.sections || []).length - 1}
                    >
                      下移
                    </Button>
                    <Button
                      size="small"
                      onClick={() => startEditSection(section.key, section.title)}
                    >
                      重命名
                    </Button>
                    <Popconfirm
                      title="删除该分组？"
                      description="分组内操作将并入第一个分组"
                      onConfirm={() => deleteSection(section.key)}
                      disabled={(layout.sections || []).length <= 1}
                    >
                      <Button size="small" danger disabled={(layout.sections || []).length <= 1}>
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                ) : null}
              </Space>
            );
          })}
          {orderedOperations.map((op, index) => {
            const hidden = layout.hidden.includes(op.id);
            const currentSection =
              (layout.sections || []).find((section) => section.operations.includes(op.id))?.key ||
              (layout.sections || [])[0]?.key;
            return (
              <div
                key={op.id}
                draggable
                onDragStart={() => setDraggingOperationId(op.id)}
                onDragEnd={() => setDraggingOperationId('')}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  moveOperationTo(draggingOperationId, op.id);
                  setDraggingOperationId('');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border:
                    draggingOperationId === op.id ? '1px dashed #1677ff' : '1px solid transparent',
                  borderRadius: 6,
                  padding: '4px 6px',
                  cursor: 'move',
                }}
              >
                <Space>
                  <Typography.Text>{op.name}</Typography.Text>
                  {hidden ? <Tag>已隐藏</Tag> : <Tag color="green">显示</Tag>}
                </Space>
                <Space>
                  <Button
                    size="small"
                    onClick={() => moveOperation(op.id, -1)}
                    disabled={index === 0}
                  >
                    上移
                  </Button>
                  <Button
                    size="small"
                    onClick={() => moveOperation(op.id, 1)}
                    disabled={index === orderedOperations.length - 1}
                  >
                    下移
                  </Button>
                  <Button size="small" onClick={() => toggleOperationVisible(op.id)}>
                    {hidden ? '显示' : '隐藏'}
                  </Button>
                  <Select
                    size="small"
                    style={{ width: 140 }}
                    value={currentSection}
                    options={sectionOptions}
                    onChange={(value) => assignSection(op.id, value)}
                  />
                </Space>
              </div>
            );
          })}
        </Space>
      </Card>
      {visibleOperations.length === 0 ? (
        <Alert type="warning" message="当前编排下没有可显示操作" showIcon />
      ) : null}
      {layout.mode === 'single' ? (
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          {visibleOperations.map((op) => renderOperationCard(op))}
        </Space>
      ) : (
        <Tabs
          items={tabSections.map((section) => ({
            key: section.key,
            label: `${section.title} (${section.ops.length})`,
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                {section.ops.map((op) => renderOperationCard(op))}
              </Space>
            ),
          }))}
        />
      )}
    </Card>
  );
}
