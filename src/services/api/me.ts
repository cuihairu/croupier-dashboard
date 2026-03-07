import { request } from '@umijs/max';

export type MeProfile = {
  id?: number;
  username: string;
  nickname?: string;
  display_name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  active?: boolean;
  roles?: string[];
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
};

export type ProfileGame = {
  game_id?: string;
  gameId?: string;
  game_name?: string;
  gameName?: string;
  envs?: string[];
  permissions?: string[];
};

export type ProfilePermission = {
  resource: string;
  actions: string[];
  game_id?: string;
  gameId?: string;
  env?: string;
};

export async function getMyProfile() {
  return request<MeProfile>('/api/v1/profile');
}

export async function getMyGames() {
  return request<{ games: ProfileGame[] }>('/api/v1/profile/games');
}

export async function getMyPermissions(params?: { game_id?: string; env?: string }) {
  const query = params
    ? {
        gameId: (params as any).gameId || params.game_id,
        env: params.env,
      }
    : undefined;
  return request<{
    permissions: ProfilePermission[];
    admin?: boolean;
    roles?: string[];
    permissionIds?: string[];
    permission_ids?: string[];
  }>('/api/v1/profile/permissions', { params: query });
}

export async function updateMyProfile(body: {
  display_name?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}) {
  return request<void>('/api/v1/profile', {
    method: 'PUT',
    data: {
      nickname: body.nickname || body.display_name,
      email: body.email,
      phone: body.phone,
      avatar: body.avatar,
    },
  });
}

export async function changeMyPassword(body: { current: string; password: string }) {
  return request<void>('/api/v1/profile/password', {
    method: 'PUT',
    data: {
      oldPassword: body.current,
      newPassword: body.password,
    },
  });
}
