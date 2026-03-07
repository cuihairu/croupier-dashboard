import { request } from '@umijs/max';
import {
  clearAllCache,
  listWorkspaceVersions,
  loadWorkspaceConfig,
  publishWorkspaceConfig,
  rollbackWorkspaceVersion,
  saveWorkspaceConfig,
  unpublishWorkspaceConfig,
} from '@/services/workspaceConfig';
import type { WorkspaceConfig } from '@/types/workspace';

const requestMock = request as jest.Mock;

describe('workspace service api branches', () => {
  const baseConfig: WorkspaceConfig = {
    objectKey: 'player',
    title: '玩家工作台',
    layout: {
      type: 'tabs',
      tabs: [
        {
          key: 'base',
          title: '基础',
          functions: ['player.list'],
          layout: {
            type: 'list',
            listFunction: 'player.list',
            columns: [{ key: 'id', title: 'ID' }],
          },
        },
      ],
    },
  };

  beforeEach(() => {
    requestMock.mockReset();
    clearAllCache();
  });

  it('publish/unpublish 成功分支', async () => {
    requestMock
      .mockResolvedValueOnce({ published: true, objectKey: 'player' })
      .mockResolvedValueOnce({ published: false, objectKey: 'player' });

    const publishResult = await publishWorkspaceConfig('player');
    const unpublishResult = await unpublishWorkspaceConfig('player');

    expect(publishResult).toEqual({ published: true, objectKey: 'player' });
    expect(unpublishResult).toEqual({ published: false, objectKey: 'player' });
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/workspaces/player/publish',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/workspaces/player/unpublish',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('listWorkspaceVersions 返回数组与空数组分支', async () => {
    requestMock.mockResolvedValueOnce({
      items: [
        {
          id: '2',
          objectKey: 'player',
          version: 2,
          config: baseConfig,
        },
      ],
    });
    const versions = await listWorkspaceVersions('player');
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(2);

    requestMock.mockResolvedValueOnce({});
    const empty = await listWorkspaceVersions('player');
    expect(empty).toEqual([]);
  });

  it('rollbackWorkspaceVersion 成功并触发缓存清理', async () => {
    requestMock
      .mockResolvedValueOnce(baseConfig)
      .mockResolvedValueOnce({ objectKey: 'player', version: 3 })
      .mockResolvedValueOnce(null);

    await saveWorkspaceConfig(baseConfig);
    const cached = await loadWorkspaceConfig('player');
    expect(cached?.title).toBe('玩家工作台');

    const rollbackResult = await rollbackWorkspaceVersion('player', '3');
    expect(rollbackResult).toEqual({ objectKey: 'player', version: 3 });

    const afterRollback = await loadWorkspaceConfig('player');
    expect(afterRollback).toBeNull();
  });

  it('publish 失败分支透传错误', async () => {
    requestMock.mockRejectedValueOnce(new Error('publish failed'));
    await expect(publishWorkspaceConfig('player')).rejects.toThrow('publish failed');
  });
});
