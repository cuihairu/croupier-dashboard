import React, { useEffect, useMemo, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { App } from 'antd';
import { useModel } from '@umijs/max';
import { useIntl } from '@umijs/max';
import { history as routerHistory } from '@umijs/max';
import {
  listDescriptors,
  fetchAssignments,
  fetchAssignmentsHistory,
  setAssignments,
  FunctionDescriptor,
} from '@/services/api';
import { buildAssignmentColumns, buildCategoryColumns, buildRouteColumns } from './columns';
import type { AssignmentHistory, AssignmentItem, HistoryAction } from './types';
import { buildAssignmentOptions, buildAssignmentStats, buildGroupedAssignments } from './viewModel';
import HistoryModal from './HistoryModal';
import CanaryModal from './CanaryModal';
import CloneModal from './CloneModal';
import PageRenderer, { renderPageActions } from './PageRenderer';
import { ASSIGNMENTS_PAGE_SCHEMA } from './pageSchema';

export default function AssignmentsPage() {
  const { message } = App.useApp();
  const intl = useIntl();
  const [descs, setDescs] = useState<FunctionDescriptor[]>([]);
  const [gameId, setGameId] = useState<string | undefined>(
    localStorage.getItem('game_id') || undefined,
  );
  const [env, setEnv] = useState<string | undefined>(localStorage.getItem('env') || undefined);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [history, setHistory] = useState<AssignmentHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyActionFilter, setHistoryActionFilter] = useState<HistoryAction>('all');
  const [canaryModalVisible, setCanaryModalVisible] = useState(false);
  const [cloneModalVisible, setCloneModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  const options = useMemo(() => buildAssignmentOptions(descs), [descs]);

  const { initialState } = useModel('@@initialState');
  const roles = useMemo(() => {
    const acc = (initialState as any)?.currentUser?.access as string | undefined;
    return (acc ? acc.split(',') : []).filter(Boolean);
  }, [initialState]);
  const canWrite = roles.includes('*') || roles.includes('assignments:write');

  // Group assignments by category
  const groupedAssignments = useMemo(
    () => buildGroupedAssignments(options, selected),
    [options, selected],
  );

  // Statistics
  const stats = useMemo(() => buildAssignmentStats(options, selected), [options, selected]);

  async function load() {
    setLoading(true);
    try {
      const d = await listDescriptors();
      if (Array.isArray(d)) {
        setDescs(d);
      } else if (d && Array.isArray((d as any)?.descriptors)) {
        setDescs((d as any).descriptors);
      } else {
        setDescs([]);
      }
      if (gameId) {
        try {
          const res = await fetchAssignments({ game_id: gameId, env });
          const m = res?.assignments || {};
          const fns = Object.values(m).flat();
          setSelected(fns || []);
        } catch {
          setSelected([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, [gameId, env]);

  useEffect(() => {
    const onStorage = () => {
      setGameId(localStorage.getItem('game_id') || undefined);
      setEnv(localStorage.getItem('env') || undefined);
    };
    const onGamesChanged = () => onStorage();
    const onRouteChanged = () => load().catch(() => {});
    window.addEventListener('storage', onStorage);
    window.addEventListener('games:changed', onGamesChanged as EventListener);
    window.addEventListener('function-route:changed', onRouteChanged as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('games:changed', onGamesChanged as EventListener);
      window.removeEventListener('function-route:changed', onRouteChanged as EventListener);
    };
  }, []);

  const onSave = async () => {
    if (!gameId) {
      message.warning(intl.formatMessage({ id: 'pages.assignments.select.game' }));
      return;
    }
    setLoading(true);
    try {
      const action = selected.length === 0 ? 'remove' : 'assign';
      const res = await setAssignments({ game_id: gameId, env, action, functions: selected });
      const unknown = res?.unknown || [];
      if (unknown.length > 0) {
        message.warning(
          intl.formatMessage(
            { id: 'pages.assignments.save.warning' },
            { count: unknown.length, ids: unknown.join(', ') },
          ),
        );
      } else {
        message.success(intl.formatMessage({ id: 'pages.assignments.save.success' }));
      }
      await load();
    } finally {
      setLoading(false);
    }
  };

  const onBatchAssign = (category: string, assign: boolean) => {
    const itemsInCategory = options.filter((o) => o.category === category);
    const ids = itemsInCategory.map((o) => o.value);

    if (assign) {
      setSelected([...new Set([...selected, ...ids])]);
    } else {
      setSelected(selected.filter((id) => !ids.includes(id)));
    }
  };

  const onCloneToEnv = async (targetEnv: string) => {
    if (!gameId) return false;
    if (!targetEnv) {
      message.warning('请选择目标环境');
      return false;
    }
    setLoading(true);
    try {
      await setAssignments({
        game_id: gameId,
        env: targetEnv,
        action: 'clone',
        functions: selected,
      });
      message.success(`已克隆分配到 ${targetEnv} 环境`);
      return true;
    } catch (e: any) {
      message.error(`克隆失败: ${e.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (
    page = historyPage,
    pageSize = historyPageSize,
    action: HistoryAction = historyActionFilter,
  ) => {
    setHistoryLoading(true);
    try {
      const res = await fetchAssignmentsHistory({
        game_id: gameId,
        env,
        action: action === 'all' ? undefined : action,
        page,
        pageSize,
      });
      const dataObj: any = (res as any)?.data || res;
      const items = Array.isArray(dataObj?.items) ? dataObj.items : [];
      setHistory(items);
      setHistoryTotal(typeof dataObj?.total === 'number' ? dataObj.total : items.length);
      setHistoryPage(page);
      setHistoryPageSize(pageSize);
    } catch {
      setHistory([]);
      setHistoryTotal(0);
    } finally {
      setHistoryLoading(false);
    }
    setHistoryVisible(true);
  };

  const columns = useMemo(
    () =>
      buildAssignmentColumns({
        canWrite,
        selected,
        setSelected,
        listColumns: ASSIGNMENTS_PAGE_SCHEMA.listColumns,
        rowActions: ASSIGNMENTS_PAGE_SCHEMA.rowActions,
        setEditingAssignment,
        setCanaryModalVisible,
        onOpenDetail: (id) => {
          const targetUrl = `/game/functions/${encodeURIComponent(id)}?tab=config&subTab=ui`;
          routerHistory.push(targetUrl);
        },
        onOpenRoute: (id) => {
          const targetUrl = `/game/functions/${encodeURIComponent(id)}?tab=config&subTab=route`;
          routerHistory.push(targetUrl);
        },
      }),
    [canWrite, selected],
  );
  const categoryColumns = buildCategoryColumns({
    categoryColumns: ASSIGNMENTS_PAGE_SCHEMA.categoryColumns,
    onBatchAssign,
  });
  const routeColumns = buildRouteColumns({
    routeColumns: ASSIGNMENTS_PAGE_SCHEMA.routeColumns,
    onEditRoute: (id) => {
      const targetUrl = `/game/functions/${encodeURIComponent(id)}?tab=config&subTab=route`;
      routerHistory.push(targetUrl);
    },
  });
  const onSelectAll = () => setSelected(options.map((o) => o.value));
  const onClearAll = () => setSelected([]);
  const onReload = () => load().catch(() => {});
  const onSelectionChange = (keys: React.Key[]) => setSelected(keys as string[]);
  const pageCtx = {
    schema: ASSIGNMENTS_PAGE_SCHEMA,
    stats,
    groupedAssignments,
    selected,
    loading,
    canWrite,
    hasScope: !!gameId,
    activeTab,
    onTabChange: setActiveTab,
    columns,
    categoryColumns,
    routeColumns,
    onSelectAll,
    onClearAll,
    onBatchAssign,
    onSave,
    onReload,
    onSelectionChange,
    onOpenHistory: loadHistory,
    onOpenClone: () => setCloneModalVisible(true),
  };
  const headerActions = renderPageActions(pageCtx);

  return (
    <PageContainer
      title="函数分配管理"
      subTitle="管理不同游戏环境中可用的函数列表"
      extra={headerActions}
    >
      <PageRenderer {...pageCtx} />

      <HistoryModal
        visible={historyVisible}
        history={history}
        loading={historyLoading}
        page={historyPage}
        pageSize={historyPageSize}
        total={historyTotal}
        actionFilter={historyActionFilter}
        onClose={() => setHistoryVisible(false)}
        onActionFilterChange={(next) => {
          setHistoryActionFilter(next);
          loadHistory(1, historyPageSize, next);
        }}
        onReload={() => loadHistory(historyPage, historyPageSize, historyActionFilter)}
        onPageChange={(page, pageSize) => loadHistory(page, pageSize, historyActionFilter)}
      />

      <CanaryModal
        visible={canaryModalVisible}
        assignment={editingAssignment}
        onClose={() => setCanaryModalVisible(false)}
        onSave={(values) => {
          message.success(`灰度配置已保存 (${values.functionId || editingAssignment?.id || '-'})`);
          setCanaryModalVisible(false);
        }}
      />

      <CloneModal
        visible={cloneModalVisible}
        onClose={() => setCloneModalVisible(false)}
        onSave={async (targetEnv) => {
          const ok = await onCloneToEnv(targetEnv);
          if (ok) setCloneModalVisible(false);
        }}
      />
    </PageContainer>
  );
}
