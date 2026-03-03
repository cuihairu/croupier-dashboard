import { useEffect, useMemo, useState } from 'react';
import { App, Modal } from 'antd';
import {
  listConfigs,
  getConfig,
  saveConfig,
  validateConfig,
  listVersions,
  getVersion,
} from '@/services/api/configs';

export default function useConfigsPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [game, setGame] = useState<string>('');
  const [env, setEnv] = useState<string>('');
  const [format, setFormat] = useState<string>('');
  const [q, setQ] = useState<string>('');
  const [cur, setCur] = useState<{
    id: string;
    format: string;
    content: string;
    version?: number;
  } | null>(null);
  const [verOpen, setVerOpen] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffLeft, setDiffLeft] = useState('');
  const [diffRight, setDiffRight] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (game) params.game_id = game;
      if (env) params.env = env;
      if (format) params.format = format;
      const term = q.trim();
      if (term) params.id_like = term;
      const r = await listConfigs(params);
      setRows(r?.items || []);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [game, env, format]);

  const openItem = async (id: string, fmt: string) => {
    try {
      const r = await getConfig(id, { game_id: game, env });
      setCur({
        id,
        format: fmt || r?.format || 'json',
        content: r?.content || '',
        version: r?.version,
      });
    } catch {
      message.error('获取配置失败');
    }
  };

  const games = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.game_id).filter(Boolean))).map((v) => ({
        label: v,
        value: v,
      })),
    [rows],
  );
  const envs = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.env).filter(Boolean))).map((v) => ({
        label: v,
        value: v,
      })),
    [rows],
  );

  const validate = async () => {
    if (!cur) return;
    const res = await validateConfig(cur.id, { format: cur.format, content: cur.content });
    if (res?.valid) message.success('校验通过');
    else message.error(res?.errors?.join('\n') || '校验失败');
  };

  const doSave = async () => {
    if (!cur) return;
    try {
      const r = await saveConfig(cur.id, {
        game_id: game,
        env,
        format: cur.format,
        content: cur.content,
        message: saveMsg,
        base_version: cur.version || 0,
      });
      message.success('已保存版本 ' + r?.version);
      setSaveOpen(false);
      setSaveMsg('');
      load();
    } catch {
      message.error('保存失败');
    }
  };

  const openVersions = async () => {
    if (!cur) return;
    const r = await listVersions(cur.id, { game_id: game, env });
    setVersions(r?.versions || []);
    setVerOpen(true);
  };

  const viewVersion = async (ver: number) => {
    if (!cur) return;
    const r = await getVersion(cur.id, ver, { game_id: game, env });
    setCur({ ...cur, content: r?.content || '', version: ver });
    setVerOpen(false);
  };

  const diffWithVersion = async (ver: number) => {
    if (!cur) return;
    const r = await getVersion(cur.id, ver, { game_id: game, env });
    setDiffLeft(cur.content || '');
    setDiffRight(String(r?.content || ''));
    setDiffOpen(true);
  };

  const rollbackTo = async (ver: number) => {
    if (!cur) return;
    const r = await getVersion(cur.id, ver, { game_id: game, env });
    Modal.confirm({
      title: '确认回滚',
      content: `确认回滚到版本 ${ver} 吗？此操作将创建一个新版本。`,
      onOk: async () => {
        try {
          await saveConfig(cur.id, {
            game_id: game,
            env,
            format: cur.format,
            content: String(r?.content || ''),
            message: `rollback to v${ver}`,
            base_version: cur.version || 0,
          });
          message.success('已回滚');
          setVerOpen(false);
          load();
        } catch {
          message.error('回滚失败');
        }
      },
    });
  };

  return {
    loading,
    rows,
    game,
    setGame,
    env,
    setEnv,
    format,
    setFormat,
    q,
    setQ,
    cur,
    setCur,
    verOpen,
    setVerOpen,
    versions,
    saveOpen,
    setSaveOpen,
    saveMsg,
    setSaveMsg,
    diffOpen,
    setDiffOpen,
    diffLeft,
    diffRight,
    games,
    envs,
    load,
    openItem,
    validate,
    doSave,
    openVersions,
    viewVersion,
    diffWithVersion,
    rollbackTo,
  };
}
