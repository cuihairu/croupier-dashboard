export type PacksPageSchema = {
  columns: Array<{
    key:
      | 'id'
      | 'name'
      | 'version'
      | 'category'
      | 'functionsCount'
      | 'entitiesCount'
      | 'status'
      | 'size'
      | 'uploadedAt'
      | 'actions';
    title: string;
    width?: number;
    copyable?: boolean;
  }>;
  overviewToolbar: Array<{
    key: 'reload' | 'export' | 'refresh';
    label: string;
    icon: 'reload' | 'download';
    visibleWhen?: 'canReload' | 'canExport' | 'exportAuthRequired';
    disabledWhen?: Array<'loading'>;
  }>;
};

export const PACKS_PAGE_SCHEMA: PacksPageSchema = {
  columns: [
    { key: 'id', title: '包ID', width: 200, copyable: true },
    { key: 'name', title: '名称', width: 180 },
    { key: 'version', title: '版本', width: 100 },
    { key: 'category', title: '分类', width: 120 },
    { key: 'functionsCount', title: '函数数', width: 100 },
    { key: 'entitiesCount', title: '实体数', width: 100 },
    { key: 'status', title: '状态', width: 100 },
    { key: 'size', title: '大小', width: 100 },
    { key: 'uploadedAt', title: '更新时间', width: 180 },
    { key: 'actions', title: '操作', width: 200 },
  ],
  overviewToolbar: [
    {
      key: 'reload',
      label: '重载',
      icon: 'reload',
      visibleWhen: 'canReload',
      disabledWhen: ['loading'],
    },
    { key: 'export', label: '导出', icon: 'download', visibleWhen: 'canExport' },
    {
      key: 'export',
      label: '导出',
      icon: 'download',
      visibleWhen: 'exportAuthRequired',
      disabledWhen: ['loading'],
    },
    { key: 'refresh', label: '刷新', icon: 'reload', disabledWhen: ['loading'] },
  ],
};
