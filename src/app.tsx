import { Footer, Question, SelectLang, AvatarDropdown, AvatarName } from '@/components';
import MessagesBell from '@/components/MessagesBell';
import { LinkOutlined, UserOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { history, Link, getLocale } from '@umijs/max';
import GameSelector from '@/components/GameSelector';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import {
  fetchCurrentUser,
  getMyPermissions,
  listDescriptors,
  type FunctionDescriptor,
} from '@/services/api';
import { hydrateScope } from '@/stores/scope';
import React, { useEffect } from 'react';
import { App as AntdApp } from 'antd';
import { setAppApi } from './utils/antdApp';
import { loadPackPlugins } from './plugin/registry';
const isDev = process.env.NODE_ENV === 'development';
const loginPath = '/user/login';
let cachedConsoleSignature = '';
type DynamicMenuItem = {
  key: string;
  name: string;
  path?: string;
  locale: false;
  children?: DynamicMenuItem[];
  routes?: DynamicMenuItem[];
};
let cachedConsoleItems: DynamicMenuItem[] = [];

const TOKEN_ZH_MAP: Record<string, string> = {
  examples: '示例',
  analytics: '分析',
  game: '游戏',
  player: '玩家',
  players: '玩家',
  user: '用户',
  users: '用户',
  create: '创建',
  update: '更新',
  delete: '删除',
  remove: '删除',
  list: '列表',
  get: '详情',
  detail: '详情',
  query: '查询',
  search: '搜索',
  invoke: '调用',
  retention: '留存',
  ban: '封禁',
  batch: '批量',
  ban_batch: '批量封禁',
  unban: '解封',
  report: '报表',
  export: '导出',
};
const humanizeToken = (token: string) =>
  token
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();

const toReadableEn = (token: string) =>
  humanizeToken(token)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const toReadableZh = (token: string) => {
  const normalized = String(token || '')
    .trim()
    .toLowerCase();
  if (!normalized) return '';
  if (TOKEN_ZH_MAP[normalized]) return TOKEN_ZH_MAP[normalized];
  const words = humanizeToken(normalized)
    .split(/\s+/)
    .map((w) => TOKEN_ZH_MAP[w] || w);
  return words.join('');
};

const isZhLocale = (locale?: string) =>
  String(locale || '')
    .toLowerCase()
    .startsWith('zh');

const fallbackNameFromId = (id?: string, locale?: string) => {
  const parts = String(id || '')
    .split('.')
    .filter(Boolean);
  if (parts.length === 0) return 'unknown';
  const tail = parts.slice(-2).map((t) => (isZhLocale(locale) ? toReadableZh(t) : toReadableEn(t)));
  return tail.join(' · ');
};

/**
 * @see  https://umijs.org/zh-CN/plugins/plugin-initial-state
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
  functionDescriptors?: FunctionDescriptor[];
}> {
  const fetchUserInfo = async () => {
    // Only call backend when we have a token; otherwise avoid a 401 on boot
    try {
      const token = localStorage.getItem('token');
      if (!token) return undefined;
      const currentUser = await fetchCurrentUser();
      const roleNames = (currentUser.roles || []).map((role) =>
        typeof role === 'string' ? role.toLowerCase() : role,
      );
      let permissionIDs: string[] = [];
      try {
        const perms = await getMyPermissions();
        permissionIDs = (perms as any)?.permissionIds || (perms as any)?.permission_ids || [];
      } catch {
        permissionIDs = [];
      }
      const accessTokens = Array.from(new Set([...(permissionIDs || []), ...(roleNames || [])]))
        .map((t) =>
          String(t || '')
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean);
      return {
        name: currentUser.username,
        userid: currentUser.username,
        access: accessTokens.join(','),
        roles: roleNames,
      } as any;
    } catch (error: any) {
      // 如果是认证错误，清除无效token
      if (error?.response?.status === 401 || error?.response?.status === 400) {
        localStorage.removeItem('token');
      }
      history.push(loginPath);
      return undefined;
    }
  };
  // 如果不是登录页面，执行
  const { location } = history;
  if (location.pathname !== loginPath) {
    const currentUser = await fetchUserInfo();
    let functionDescriptors: FunctionDescriptor[] | undefined;
    if (currentUser) {
      hydrateScope();
      try {
        const descriptors = await listDescriptors();
        functionDescriptors = Array.isArray(descriptors) ? descriptors : [];
      } catch {
        functionDescriptors = undefined;
      }
    }
    return {
      fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
      functionDescriptors,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({ initialState, setInitialState }) => {
  const AppApiRegistrar: React.FC = () => {
    const inst = AntdApp.useApp();
    useEffect(() => {
      setAppApi({ message: inst.message, notification: inst.notification });
    }, [inst]);
    useEffect(() => {
      if (initialState?.currentUser) {
        loadPackPlugins().catch(() => {});
      }
    }, [initialState?.currentUser]);
    useEffect(() => {
      const refreshDescriptors = async () => {
        if (!initialState?.currentUser) return;
        try {
          const descriptors = await listDescriptors();
          const next = Array.isArray(descriptors) ? descriptors : [];
          setInitialState((prev) => ({
            ...prev,
            functionDescriptors: next,
          }));
        } catch {
          // ignore refresh errors
        }
      };
      const onRouteChanged = () => {
        refreshDescriptors().catch(() => {});
      };
      window.addEventListener('function-route:changed', onRouteChanged as EventListener);
      return () => {
        window.removeEventListener('function-route:changed', onRouteChanged as EventListener);
      };
    }, [initialState?.currentUser, setInitialState]);
    return null;
  };
  const isAuthed = !!initialState?.currentUser;
  return {
    actionsRender: () =>
      [
        <GameSelector key="scope" variant="header" />,
        isAuthed ? <MessagesBell key="msgs" /> : null,
        <Question key="doc" />,
        <SelectLang key="SelectLang" />,
      ].filter(Boolean) as any,
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      icon: initialState?.currentUser?.avatar ? undefined : <UserOutlined />,
      title: <AvatarName />,
      render: (_, avatarChildren) => {
        return <AvatarDropdown menu>{avatarChildren}</AvatarDropdown>;
      },
    },
    menuDataRender: (menuData) => {
      const descriptors = (initialState as any)?.functionDescriptors as
        | FunctionDescriptor[]
        | undefined;
      if (!Array.isArray(descriptors) || descriptors.length === 0) return menuData;
      const locale = getLocale();
      const preferZh = isZhLocale(locale);

      const resolveText = (text?: { zh?: string; en?: string }) => {
        if (!text) return '';
        if (preferZh) return text.zh || text.en || '';
        return text.en || text.zh || '';
      };

      const localizeToken = (value?: string) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        return preferZh ? toReadableZh(raw) : toReadableEn(raw);
      };
      const localizeFreeText = (value?: string) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const chunks = raw
          .split(/[./\s]+/)
          .map((c) => c.trim())
          .filter(Boolean);
        if (chunks.length === 0) return localizeToken(raw);
        return chunks.map((c) => localizeToken(c)).join(preferZh ? '' : ' / ');
      };

      const safeName = (d: FunctionDescriptor) => {
        const displayName = resolveText(d?.display_name);
        if (displayName) return displayName;
        const operationDisplay = resolveText((d as any)?.operation_display);
        if (operationDisplay) return operationDisplay;
        const operation = sanitizeNodeKey(String((d as any)?.operation || ''));
        if (operation && operation !== 'custom') {
          return localizeToken(operation) || operation;
        }
        const entity = sanitizeNodeKey(String((d as any)?.entity || ''));
        const parts = String(d?.id || '')
          .split('.')
          .filter(Boolean);
        const tail = sanitizeNodeKey(parts[parts.length - 1] || '');
        if (tail && tail !== entity) {
          return localizeToken(tail) || tail;
        }
        return fallbackNameFromId(d?.id, locale);
      };
      const sanitizeNodeKey = (raw?: string) => {
        const text = String(raw || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9._-]+/g, '_')
          .replace(/[_\-.]{2,}/g, '_')
          .replace(/^[_\-.]+|[_\-.]+$/g, '');
        return text;
      };
      const normalizeNodes = (nodes: string[]) => {
        const out: string[] = [];
        nodes.forEach((raw) => {
          String(raw || '')
            .split(/[/>.]+/)
            .forEach((part) => {
              const node = sanitizeNodeKey(part);
              if (!node) return;
              if (out[out.length - 1] === node) return;
              out.push(node);
            });
        });
        return out;
      };
      const inferMenuNodes = (d: FunctionDescriptor) => {
        const menuNodes = Array.isArray(d.menu?.nodes) ? d.menu!.nodes! : [];
        const normalizedMenuNodes = normalizeNodes(menuNodes);
        const operation = sanitizeNodeKey(String((d as any)?.operation || ''));
        if (normalizedMenuNodes.length > 0) return normalizedMenuNodes;

        const category = sanitizeNodeKey(d.category || '');
        const entity = sanitizeNodeKey(String((d as any)?.entity || ''));
        const inferred: string[] = [];
        if (category) inferred.push(category);
        if (entity) inferred.push(entity);
        const normalizedInferred = normalizeNodes(inferred);
        if (normalizedInferred.length > 0) return normalizedInferred;

        const parts = String(d.id || '')
          .split('.')
          .map((p) => sanitizeNodeKey(p));
        const normalizedParts = normalizeNodes(parts);
        if (normalizedParts.length >= 3) {
          const candidate = [normalizedParts[0], normalizedParts[normalizedParts.length - 2]];
          return normalizeNodes(candidate.filter((node) => node && node !== operation));
        }
        if (normalizedParts.length === 1) return normalizedParts;
        return ['general'];
      };

      const isEntity = (d: FunctionDescriptor) => d?.type === 'entity';

      const buildPath = (base: string, fid: string, entityType = false) => {
        const inferredEntity = sanitizeNodeKey(
          String((descriptors.find((x) => x.id === fid) as any)?.entity || ''),
        );
        if (!base) {
          if (entityType || inferredEntity) {
            base = `/game/entities/${inferredEntity || 'general'}`;
          } else {
            base = '/game/functions/invoke';
          }
        }
        const sep = base.includes('?') ? '&' : '?';
        const paramKey = entityType ? 'id' : 'fid';
        return `${base}${sep}${paramKey}=${encodeURIComponent(fid)}`;
      };

      const visible = descriptors
        .filter((d) => d && d.id && !(d.menu && d.menu.hidden))
        .map((d) => ({
          nodes: inferMenuNodes(d),
          id: d.id,
          name: safeName(d),
          category: d.category || 'uncategorized',
          order: typeof d.menu?.order === 'number' ? d.menu!.order! : 100,
          entityType: isEntity(d),
          path: buildPath(d.menu?.path || '', d.id, isEntity(d)),
        }));

      if (visible.length === 0) return menuData;

      const signature = visible
        .map(
          (it) =>
            `${locale}|${it.id}|${it.order}|${it.name}|${(it.nodes || []).join('/') || ''}|${
              it.path
            }`,
        )
        .sort()
        .join('||');
      const consoleItems =
        signature === cachedConsoleSignature
          ? cachedConsoleItems
          : (() => {
              const CATALOG_PATH = '/game/functions/catalog';
              const MAX_GROUPS = 10;
              const MAX_ITEMS_PER_GROUP = 6;
              const sorted = [...visible].sort(
                (a, b) => a.order - b.order || a.name.localeCompare(b.name),
              );
              type MenuGroup = {
                key: string;
                name: string;
                order: number;
                items: Array<{
                  id: string;
                  name: string;
                  path: string;
                  order: number;
                }>;
              };
              const groups = new Map<string, MenuGroup>();

              sorted.forEach((it) => {
                const nodes = (it.nodes || []).filter(Boolean);
                const primary = sanitizeNodeKey(nodes[0] || it.category || 'general') || 'general';
                const secondary = sanitizeNodeKey(nodes[1] || '');
                const groupName =
                  localizeFreeText(primary) ||
                  localizeToken(primary) ||
                  (preferZh ? '未分组' : 'Ungrouped');
                const itemName = secondary
                  ? `${localizeToken(secondary) || secondary} · ${it.name}`
                  : it.name;
                const key = `console-group-${primary}`;
                const current = groups.get(key) || {
                  key,
                  name: groupName,
                  order: it.order,
                  items: [],
                };
                current.order = Math.min(current.order, it.order);
                current.items.push({
                  id: it.id,
                  name: itemName,
                  path: it.path,
                  order: it.order,
                });
                groups.set(key, current);
              });

              const browseLabel = preferZh ? '打开目录' : 'Open Catalog';
              const moreLabel = preferZh ? '更多函数…' : 'More Functions…';
              const catalogLabel = preferZh ? '函数目录' : 'Function Catalog';
              const builtGroups = Array.from(groups.values())
                .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
                .slice(0, MAX_GROUPS)
                .map((group) => {
                  const groupPath = CATALOG_PATH;
                  const sortedItems = [...group.items].sort(
                    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
                  );
                  const children: DynamicMenuItem[] = [
                    {
                      key: `${group.key}-all`,
                      name: `${browseLabel} (${group.items.length})`,
                      path: groupPath,
                      locale: false,
                    },
                    ...sortedItems.slice(0, MAX_ITEMS_PER_GROUP).map((item) => ({
                      key: `console-fn-${item.id}`,
                      name: item.name,
                      path: item.path,
                      locale: false,
                    })),
                  ];
                  if (sortedItems.length > MAX_ITEMS_PER_GROUP) {
                    children.push({
                      key: `${group.key}-more`,
                      name: moreLabel,
                      path: groupPath,
                      locale: false,
                    });
                  }
                  return {
                    key: group.key,
                    name: group.name,
                    path: groupPath,
                    locale: false,
                    children,
                    routes: children,
                  };
                });
              return [
                {
                  key: 'console-catalog',
                  name: catalogLabel,
                  path: CATALOG_PATH,
                  locale: false,
                },
                ...builtGroups,
              ];
            })();
      if (signature !== cachedConsoleSignature) {
        cachedConsoleSignature = signature;
        cachedConsoleItems = consoleItems;
      }

      const inject = (items: any[]): any[] =>
        (items || []).map((it: any) => {
          const children = it.children || it.routes;
          const patchedChildren = Array.isArray(children) ? inject(children) : children;
          const out = {
            ...it,
            ...(Array.isArray(children)
              ? { children: patchedChildren, routes: patchedChildren }
              : {}),
          };
          if (out.path === '/console') {
            out.children = consoleItems;
            out.routes = consoleItems;
            out.path = '/game/functions/catalog';
          }
          return out;
        });

      return inject(menuData as any);
    },
    footerRender: () => <Footer />,

    onPageChange: () => {
      const { location } = history;
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        history.push(loginPath);
      }
    },
    bgLayoutImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: isDev
      ? [
          <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
            <LinkOutlined />
            <span>OpenAPI 文档</span>
          </Link>,
        ]
      : [],
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
        <AntdApp>
          <AppApiRegistrar />
          {children}
          {isDev && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          )}
        </AntdApp>
      );
    },
    ...initialState?.settings,
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request = {
  ...errorConfig,
};
