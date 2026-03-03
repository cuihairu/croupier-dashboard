import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import HistoryModal from './HistoryModal';
import CanaryModal from './CanaryModal';
import CloneModal from './CloneModal';
import PageRenderer from './PageRenderer';
import useAssignmentsPage from './useAssignmentsPage';

export default function AssignmentsPage() {
  const {
    message,
    pageCtx,
    headerActions,
    historyVisible,
    setHistoryVisible,
    history,
    historyLoading,
    historyPage,
    historyPageSize,
    historyTotal,
    historyActionFilter,
    setHistoryActionFilter,
    loadHistory,
    canaryModalVisible,
    setCanaryModalVisible,
    editingAssignment,
    cloneModalVisible,
    setCloneModalVisible,
    onCloneToEnv,
  } = useAssignmentsPage();

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
