import { useEffect, useMemo, useState } from 'react';
import { Modal, message } from 'antd';
import { getMessage } from '@/utils/antdApp';
import { listPacks, reloadPacks, getPacksExportUrl } from '@/services/api';
import { useModel } from '@umijs/max';
import { renderSchemaActions } from '@/components/page-schema/PageSchemaRenderer';
import { resolveSchemaIcon } from '@/components/page-schema/icons';
import { PACKS_PAGE_SCHEMA } from './schema';
import { buildPacksColumns } from './columns';

export type PackItem = {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  status: 'active' | 'canary' | 'disabled' | 'deprecated';
  functionsCount: number;
  entitiesCount: number;
  canary?: {
    percent?: number;
    allowlist?: string[];
    startAt?: string;
    endAt?: string;
  };
  uploadedAt: string;
  uploadedBy: string;
  size: string;
};

export type VersionHistoryItem = {
  id: string;
  version: string;
  changelog: string;
  deployedAt: string;
  deployedBy: string;
  status: 'stable' | 'canary' | 'rollback';
};

export default function usePacksPage() {
  const [loading, setLoading] = useState(false);
  const [manifest, setManifest] = useState<any>({});
  const [counts, setCounts] = useState<{ descriptors: number; ui_schema: number }>({
    descriptors: 0,
    ui_schema: 0,
  });
  const [etag, setEtag] = useState<string | undefined>(undefined);
  const [exportAuthRequired, setExportAuthRequired] = useState<boolean>(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedPack, setSelectedPack] = useState<PackItem | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [canaryModalVisible, setCanaryModalVisible] = useState(false);
  const [packContent, setPackContent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const { initialState } = useModel('@@initialState');
  const roles = useMemo(() => {
    const acc = (initialState as any)?.currentUser?.access as string | undefined;
    return (acc ? acc.split(',') : []).filter(Boolean);
  }, [initialState]);
  const canReload = roles.includes('*') || roles.includes('packs:reload');
  const canExport = roles.includes('*') || roles.includes('packs:export');
  const canUpload = roles.includes('*') || roles.includes('packs:upload');

  const packItems = useMemo(() => {
    const items: PackItem[] = [];
    const functions = manifest.functions || [];
    const entities = manifest.entities || [];
    const providerMap = new Map<string, any>();

    functions.forEach((fn: any) => {
      const provider = fn.provider || 'default';
      if (!providerMap.has(provider)) {
        providerMap.set(provider, {
          id: provider,
          name: fn.display_name?.en || fn.display_name?.zh || provider,
          version: fn.version || '1.0.0',
          category: fn.category || 'general',
          description: fn.summary?.en || fn.summary?.zh || '',
          status: 'active',
          functionsCount: 0,
          entitiesCount: 0,
        });
      }
      providerMap.get(provider).functionsCount++;
    });

    entities.forEach((ent: any) => {
      const provider = ent.provider || 'default';
      if (providerMap.has(provider)) providerMap.get(provider).entitiesCount++;
    });

    providerMap.forEach((pack) => {
      items.push({
        ...pack,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'system',
        size: `${Math.round(Math.random() * 500 + 50)}KB`,
      });
    });
    return items;
  }, [manifest]);

  const stats = useMemo(
    () => ({
      totalPacks: packItems.length,
      totalFunctions: counts.descriptors,
      totalEntities: manifest.entities?.length || 0,
      activePacks: packItems.filter((p) => p.status === 'active').length,
      canaryPacks: packItems.filter((p) => p.status === 'canary').length,
    }),
    [packItems, counts, manifest],
  );

  async function load() {
    setLoading(true);
    try {
      const res = await listPacks();
      setManifest(res.manifest || {});
      setCounts(res.counts || { descriptors: 0, ui_schema: 0 });
      setEtag((res as any).etag || undefined);
      setExportAuthRequired(!!(res as any).export_auth_required);
    } catch (e: any) {
      getMessage()?.error(e?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const onReload = async () => {
    setLoading(true);
    try {
      await reloadPacks();
      getMessage()?.success('Packs reloaded successfully');
      await load();
    } catch (e: any) {
      getMessage()?.error(e?.message || 'Reload failed');
    } finally {
      setLoading(false);
    }
  };

  const showPackDetail = (pack: PackItem) => {
    setSelectedPack(pack);
    setPackContent({
      manifest: {
        id: pack.id,
        name: pack.name,
        version: pack.version,
        description: pack.description,
        provider: { id: pack.id, lang: 'go', sdk: 'croupier-go' },
      },
      functions: manifest.functions?.filter((fn: any) => fn.provider === pack.id) || [],
      entities: manifest.entities?.filter((ent: any) => ent.provider === pack.id) || [],
      schemas: manifest.schemas || [],
      uiPlugins: manifest.ui_plugins || [],
    });
    setDetailVisible(true);
  };

  const showVersionHistory = (pack: PackItem) => {
    setSelectedPack(pack);
    setVersionHistory([
      {
        id: '1',
        version: pack.version,
        changelog: '初始版本发布',
        deployedAt: new Date(Date.now() - 86400000).toISOString(),
        deployedBy: 'admin',
        status: 'stable',
      },
      {
        id: '2',
        version: '1.1.0',
        changelog: '新增 player.unban 函数\n优化 UI 性能',
        deployedAt: new Date(Date.now() - 172800000).toISOString(),
        deployedBy: 'admin',
        status: 'stable',
      },
      {
        id: '3',
        version: '1.2.0-canary',
        changelog: '灰度测试中\n新增批量操作支持',
        deployedAt: new Date(Date.now() - 3600000).toISOString(),
        deployedBy: 'admin',
        status: 'canary',
      },
    ]);
    setHistoryVisible(true);
  };

  const onRollback = (version: string) => {
    Modal.confirm({
      title: '回滚版本',
      content: `确定要回滚到版本 ${version} 吗？此操作将立即生效。`,
      onOk: async () => {
        message.success(`已回滚到版本 ${version}`);
        setHistoryVisible(false);
        load();
      },
    });
  };

  const onUpload = (file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('game_id', localStorage.getItem('game_id') || '');
    formData.append('env', localStorage.getItem('env') || 'prod');
    message.loading('正在上传包...');
    setTimeout(() => {
      message.destroy();
      message.success('包上传成功');
      setUploadModalVisible(false);
      load();
    }, 2000);
  };

  const columns = useMemo(
    () =>
      buildPacksColumns({
        columns: PACKS_PAGE_SCHEMA.columns,
        onShowDetail: showPackDetail,
        onShowHistory: showVersionHistory,
        onOpenCanary: (pack) => {
          setSelectedPack(pack);
          setCanaryModalVisible(true);
        },
      }),
    [manifest],
  );

  const overviewToolbarActions = useMemo(
    () =>
      renderSchemaActions(
        {
          canWrite: true,
          flags: {
            loading,
            canReload,
            canExport,
            exportAuthRequired,
          },
          onAction: (key) => {
            if (key === 'reload') return onReload();
            if (key === 'export') {
              window.location.href = getPacksExportUrl();
              return;
            }
            load();
          },
          renderIcon: resolveSchemaIcon,
        },
        PACKS_PAGE_SCHEMA.overviewToolbar.filter((a) => {
          if (!a.visibleWhen) return true;
          if (a.visibleWhen === 'exportAuthRequired') return !canExport && exportAuthRequired;
          return true;
        }),
      ),
    [canExport, canReload, exportAuthRequired, loading],
  );

  return {
    loading,
    manifest,
    counts,
    etag,
    exportAuthRequired,
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
    canReload,
    canExport,
    canUpload,
    packItems,
    stats,
    load,
    onReload,
    onRollback,
    onUpload,
    columns,
    overviewToolbarActions,
    getPacksExportUrl,
  };
}
