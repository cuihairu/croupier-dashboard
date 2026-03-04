import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Alert, Badge, Button, Card, Form, Space, Tabs } from 'antd';
import {
  ArrowLeftOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import { App } from 'antd';
import { BasicInfoTab, PermissionsTab } from './DetailSections';
import { AnalyticsTab, HistoryTab, WarningsTab } from './DetailTabs';
import DetailConfigTab from './DetailConfigTab';
import useFunctionDetailPage from './useFunctionDetailPage';
import { FUNCTION_DETAIL_SCHEMA, type DetailActionKey, type DetailTabKey } from './detailSchema';

export default function FunctionDetailPage() {
  const { message } = App.useApp();
  const location = useLocation();
  const params = useParams<{ id: string }>();
  const searchParams = new URLSearchParams(location.search);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'basic');
  const [activeSubTab, setActiveSubTab] = useState(searchParams.get('subTab') || 'json');

  const {
    loading,
    functionDetail,
    editing,
    setEditing,
    form,
    permLoading,
    permSaving,
    permError,
    permForm,
    routeConfigSaving,
    routeConfigForm,
    routePreview,
    parsedInputSchema,
    effectiveCategory,
    jsonViewData,
    uiDescriptor,
    loadDetail,
    handleSave,
    handleStatusToggle,
    handleCopy,
    handleDelete,
    handleSavePermissions,
    handleSaveRoute,
    handleResetRoute,
    onSaveUi,
  } = useFunctionDetailPage(params.id);

  const buildSearch = (tab: string, subTab?: string) => {
    const search = new URLSearchParams(location.search);
    search.set('tab', tab);
    if (tab === 'config') search.set('subTab', subTab || activeSubTab || 'json');
    else search.delete('subTab');
    const query = search.toString();
    return query ? `?${query}` : '';
  };

  useEffect(() => {
    const next = new URLSearchParams(location.search);
    setActiveTab(next.get('tab') || 'basic');
    setActiveSubTab(next.get('subTab') || 'json');
  }, [location.search]);

  if (!functionDetail && !loading) {
    return (
      <PageContainer>
        <Alert
          message="函数不存在"
          description="请检查函数ID是否正确"
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => history.push('/system/functions/catalog')}>
              返回函数列表
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const tabContent: Record<DetailTabKey, React.ReactNode> = {
    basic: (
      <BasicInfoTab
        functionDetail={functionDetail}
        effectiveCategory={effectiveCategory}
        editing={editing}
        onStatusToggle={handleStatusToggle}
      />
    ),
    config: (
      <DetailConfigTab
        functionId={params.id || ''}
        activeSubTab={activeSubTab}
        onSubTabChange={(key) => {
          setActiveSubTab(key);
          history.replace(`${location.pathname}${buildSearch('config', key)}`);
        }}
        jsonViewData={jsonViewData}
        onJsonCopySuccess={() => message.success('JSON 已复制')}
        onJsonCopyError={() => message.error('复制失败')}
        uiDescriptor={uiDescriptor}
        parsedInputSchema={parsedInputSchema}
        onSaveUi={onSaveUi}
        routePreview={routePreview || {}}
        routeConfigForm={routeConfigForm}
        routeConfigSaving={routeConfigSaving}
        onSaveRoute={handleSaveRoute}
        onResetRoute={handleResetRoute}
        onOpenAssignments={() => history.push('/system/functions/assignments')}
      />
    ),
    permissions: (
      <PermissionsTab
        functionId={params.id}
        permError={permError}
        permLoading={permLoading}
        permSaving={permSaving}
        permForm={permForm}
        onSave={handleSavePermissions}
      />
    ),
    history: <HistoryTab functionId={params.id || ''} />,
    analytics: <AnalyticsTab functionId={params.id || ''} />,
    warnings: <WarningsTab functionId={params.id || ''} />,
  };

  const mainTabItems = FUNCTION_DETAIL_SCHEMA.tabs.map((tab) => ({
    key: tab.key,
    label: tab.label,
    children: tabContent[tab.key],
  }));

  const actionFlags = {
    loading,
    noFunction: !functionDetail,
  } as const;

  const runAction = (key: DetailActionKey) => {
    if (key === 'reload') return loadDetail();
    if (key === 'copy') return handleCopy();
    if (key === 'delete') return handleDelete();
    if (editing) form.submit();
    else setEditing(true);
    return undefined;
  };

  return (
    <PageContainer
      title={
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => history.push('/system/functions/catalog')}
          >
            返回
          </Button>
          <span>{functionDetail?.name || functionDetail?.id}</span>
          <Badge status={functionDetail?.enabled ? 'success' : 'default'} />
        </Space>
      }
      extra={[
        <Space key="actions">
          {FUNCTION_DETAIL_SCHEMA.actions.map((action) => (
            <Button
              key={action.key}
              type={action.primary ? 'primary' : 'default'}
              danger={!!action.danger}
              loading={action.loadingWhen ? !!actionFlags[action.loadingWhen] : false}
              disabled={!!action.disabledWhen?.some((flag) => !!actionFlags[flag])}
              icon={
                action.key === 'reload' ? (
                  <ReloadOutlined />
                ) : action.key === 'copy' ? (
                  <CopyOutlined />
                ) : action.key === 'delete' ? (
                  <DeleteOutlined />
                ) : editing ? (
                  <SaveOutlined />
                ) : (
                  <EditOutlined />
                )
              }
              onClick={() => runAction(action.key)}
            >
              {action.key === 'edit' && editing ? '保存' : action.label}
            </Button>
          ))}
        </Space>,
      ]}
    >
      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={handleSave} component={false}>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key);
              history.replace(
                `${location.pathname}${buildSearch(
                  key,
                  key === 'config' ? activeSubTab : undefined,
                )}`,
              );
            }}
            items={mainTabItems}
          />
        </Form>
      </Card>
    </PageContainer>
  );
}
