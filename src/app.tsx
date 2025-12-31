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
import { fetchCurrentUser, getMyPermissions, listDescriptors, type FunctionDescriptor } from '@/services/api';
import React, { useEffect } from 'react';
import { App as AntdApp } from 'antd';
import { setAppApi } from './utils/antdApp';
import { loadPackPlugins } from './plugin/registry';
const isDev = process.env.NODE_ENV === 'development';
const loginPath = '/user/login';

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
        .map((t) => String(t || '').trim().toLowerCase())
        .filter(Boolean);
      return {
        name: currentUser.username,
        userid: currentUser.username,
        access: accessTokens.join(','),
        roles: roleNames,
      } as any;
    } catch (error) {
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
    return null;
  };
  const isAuthed = !!initialState?.currentUser;
  return {
    actionsRender: () => [
      <GameSelector key="scope" />,
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
      const descriptors = (initialState as any)?.functionDescriptors as FunctionDescriptor[] | undefined;
      if (!Array.isArray(descriptors) || descriptors.length === 0) return menuData;

      const safeName = (d: FunctionDescriptor) =>
        d?.display_name?.zh || d?.display_name?.en || d?.id || 'unknown';

      const buildPath = (base: string, fid: string) => {
        if (!base) base = '/game/functions/invoke';
        const sep = base.includes('?') ? '&' : '?';
        return `${base}${sep}fid=${encodeURIComponent(fid)}`;
      };

      const visible = descriptors
        .filter((d) => d && d.id && !(d.menu && d.menu.hidden))
        .map((d) => ({
          id: d.id,
          name: safeName(d),
          category: d.category || 'uncategorized',
          order: typeof d.menu?.order === 'number' ? d.menu!.order! : 100,
          path: buildPath(d.menu?.path || '/game/functions/invoke', d.id),
        }));

      if (visible.length === 0) return menuData;

      const byCategory = new Map<string, typeof visible>();
      for (const it of visible) {
        const arr = byCategory.get(it.category) || [];
        arr.push(it);
        byCategory.set(it.category, arr);
      }

      const categoryItems = Array.from(byCategory.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([category, items]) => {
          const children = items
            .sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name))
            .map((it) => ({
              name: it.name,
              path: it.path,
            }));
          return {
            name: category === 'uncategorized' ? 'Other' : category,
            path: `/game/functions/catalog?category=${encodeURIComponent(category)}`,
            children,
          };
        });

      const registeredGroup = {
        name: 'Registered',
        path: '/game/functions/catalog?tab=registered',
        children: categoryItems,
      };

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
          if (out.path === '/game/functions') {
            const curChildren = Array.isArray(out.children) ? out.children : [];
            const exists = curChildren.some((c: any) => c?.path === registeredGroup.path || c?.name === registeredGroup.name);
            if (!exists) {
              out.children = [...curChildren, registeredGroup];
              out.routes = out.children;
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
