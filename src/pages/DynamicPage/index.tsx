/**
 * 动态页面容器
 *
 * 根据路由路径加载对应的页面配置，并使用 PageGenerator 渲染
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from '@umijs/max';
import { Spin, Result } from 'antd';
import PageGenerator from '@/components/PageGenerator';
import type { PageConfig } from '@/components/PageGenerator/types';
import { getPageConfig } from '@/services/pageConfig';

const DynamicPage: React.FC = () => {
  const location = useLocation();
  const [config, setConfig] = useState<PageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, [location.pathname]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      // 根据路径加载配置
      const pageConfig = await getPageConfig(location.pathname);

      if (!pageConfig) {
        setError('页面配置不存在');
        return;
      }

      setConfig(pageConfig);
    } catch (err: any) {
      setError(err.message || '加载页面配置失败');
      console.error('Failed to load page config:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (error || !config) {
    return <Result status="404" title="页面不存在" subTitle={error || '未找到页面配置'} />;
  }

  return <PageGenerator config={config} />;
};

export default DynamicPage;
