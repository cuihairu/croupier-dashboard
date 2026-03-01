import { Footer, Question, SelectLang, AvatarDropdown, AvatarName } from '@/components';
import MessagesBell from '@/components/MessagesBell';
import { LinkOutlined, UserOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
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
let cachedConsoleItems: { key: string; name: string; path: string; locale: false }[] = [];

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

const fallbackNameFromId = (id?: string) => {
  const parts = String(id || '')
    .split('.')
    .filter(Boolean);
  if (parts.length === 0) return 'unknown';
  const tail = parts.slice(-2).map(toReadableZh);
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

      const safeName = (d: FunctionDescriptor) => {
        if (d?.display_name?.zh) return d.display_name.zh;
        if (d?.summary?.zh) return d.summary.zh;
        if (d?.display_name?.en) return toReadableZh(d.display_name.en);
        if (d?.summary?.en) return toReadableZh(d.summary.en);
        return fallbackNameFromId(d?.id);
      };

      const isEntity = (d: FunctionDescriptor) => d?.type === 'entity';

      const buildPath = (base: string, fid: string, entityType = false) => {
        if (!base) {
          base = entityType ? '/game/entities/view' : '/game/functions/invoke';
        }
        const sep = base.includes('?') ? '&' : '?';
        const paramKey = entityType ? 'id' : 'fid';
        return `${base}${sep}${paramKey}=${encodeURIComponent(fid)}`;
      };

      const visible = descriptors
        .filter((d) => d && d.id && !(d.menu && d.menu.hidden))
        .map((d) => ({
          id: d.id,
          name: safeName(d),
          category: d.category || 'uncategorized',
          order: typeof d.menu?.order === 'number' ? d.menu!.order! : 100,
          entityType: isEntity(d),
          path: buildPath(d.menu?.path || '', d.id, isEntity(d)),
        }));

      if (visible.length === 0) return menuData;

      const signature = visible
        .map((it) => `${it.id}|${it.order}|${it.name}|${it.path}`)
        .sort()
        .join('||');
      const consoleItems =
        signature === cachedConsoleSignature
          ? cachedConsoleItems
          : visible
              .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
              .map((it) => ({
                key: `console-fn-${it.id}`,
                name: it.name,
                path: it.path,
                // Runtime-registered functions do not have stable locale keys.
                locale: false as const,
              }));
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
            if (consoleItems[0]?.path) {
              // Top-level "Control Console" should land on the first registered function's runtime UI.
              out.path = consoleItems[0].path;
            }
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
