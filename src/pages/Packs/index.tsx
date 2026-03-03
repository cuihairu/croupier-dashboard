import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Space, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import GameSelector from '@/components/GameSelector';
import usePacksPage from './usePacksPage';
import StatsRow from './StatsRow';
import OverviewCard from './OverviewCard';
import PackDetailDrawer from './PackDetailDrawer';
import VersionHistoryModal from './VersionHistoryModal';
import UploadPackModal from './UploadPackModal';
import CanaryModal from './CanaryModal';

export default function PacksPage() {
  const {
    loading,
    manifest,
    counts,
    etag,
    detailVisible,
    setDetailVisible,
    selectedPack,
    historyVisible,
    setHistoryVisible,
    versionHistory,
    uploadModalVisible,
    setUploadModalVisible,
    canaryModalVisible,
    setCanaryModalVisible,
    packContent,
    activeTab,
    setActiveTab,
    canUpload,
    packItems,
    stats,
    load,
    onReload,
    onRollback,
    onUpload,
    columns,
    overviewToolbarActions,
  } = usePacksPage();

  return (
    <PageContainer
      title="包管理"
      subTitle="管理函数包的版本、发布和灰度"
      extra={[
        <GameSelector key="game" />,
        <Button
          key="upload"
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => setUploadModalVisible(true)}
          disabled={!canUpload}
        >
          上传包
        </Button>,
      ]}
    >
      <StatsRow stats={stats} uiSchemaCount={counts.ui_schema} />
      <OverviewCard
        activeTab={activeTab}
        onTabChange={setActiveTab}
        columns={columns}
        dataSource={packItems}
        loading={loading}
        toolbarActions={overviewToolbarActions}
        manifest={manifest}
        etag={etag}
      />
      <PackDetailDrawer
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        selectedPack={selectedPack}
        packContent={packContent}
      />
      <VersionHistoryModal
        open={historyVisible}
        packName={selectedPack?.name}
        items={versionHistory}
        onClose={() => setHistoryVisible(false)}
        onRollback={onRollback}
      />
      <UploadPackModal
        open={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        onSuccess={() => {
          setUploadModalVisible(false);
          load();
        }}
        onUpload={onUpload}
      />
      <CanaryModal
        open={canaryModalVisible}
        selectedPack={selectedPack}
        onClose={() => setCanaryModalVisible(false)}
        onSaved={() => {
          setCanaryModalVisible(false);
          load();
        }}
      />
    </PageContainer>
  );
}
