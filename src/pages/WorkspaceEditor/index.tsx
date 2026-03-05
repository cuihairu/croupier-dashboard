/**
 * Workspace 编排器
 *
 * 可视化编排 Workspace 配置的工具。
 *
 * @module pages/WorkspaceEditor
 */

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Row, Col, Button, message, Spin } from 'antd';
import { useParams, history } from '@umijs/max';
import type { WorkspaceConfig } from '@/types/workspace';
import { loadWorkspaceConfig, saveWorkspaceConfig } from '@/services/workspaceConfig';
import FunctionList from './components/FunctionList';
import LayoutDesigner from './components/LayoutDesigner';
import ConfigPreview from './components/ConfigPreview';

/**
 * Workspace 编排器页面
 */
export default function WorkspaceEditor() {
  const params = useParams<{ objectKey: string }>();
  const objectKey = params.objectKey || '';

  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [availableFunctions, setAvailableFunctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 加载数据
  useEffect(() => {
    loadData();
  }, [objectKey]);

  const loadData = async () => {
    if (!objectKey) {
      message.error('缺少对象标识');
      return;
    }

    setLoading(true);
    try {
      // 加载配置
      const workspaceConfig = await loadWorkspaceConfig(objectKey);
      if (workspaceConfig) {
        setConfig(workspaceConfig);
      } else {
        // 创建新配置
        setConfig({
          objectKey,
          title: `${objectKey} 管理`,
          layout: { type: 'tabs', tabs: [] },
        });
      }

      // 加载可用函数
      // TODO: 调用 API 获取函数描述符列表
      // const descriptors = await listDescriptors();
      // const functions = descriptors.filter(d => d.entity === objectKey);
      // setAvailableFunctions(functions);

      // 临时使用模拟数据
      setAvailableFunctions([
        {
          id: `${objectKey}.list`,
          entity: objectKey,
          operation: 'list',
          display_name: { zh: '列表查询', en: 'List' },
        },
        {
          id: `${objectKey}.getInfo`,
          entity: objectKey,
          operation: 'query',
          display_name: { zh: '获取信息', en: 'Get Info' },
        },
        {
          id: `${objectKey}.create`,
          entity: objectKey,
          operation: 'create',
          display_name: { zh: '创建', en: 'Create' },
        },
        {
          id: `${objectKey}.update`,
          entity: objectKey,
          operation: 'update',
          display_name: { zh: '更新', en: 'Update' },
        },
        {
          id: `${objectKey}.delete`,
          entity: objectKey,
          operation: 'delete',
          display_name: { zh: '删除', en: 'Delete' },
        },
      ]);
    } catch (error: any) {
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    if (!config) {
      message.error('配置为空');
      return;
    }

    setSaving(true);
    try {
      await saveWorkspaceConfig(config);
      message.success('保存成功');
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 预览配置
  const handlePreview = () => {
    if (!config) {
      message.error('配置为空');
      return;
    }

    // 跳转到 Workspace 页面预览
    history.push(`/console/${objectKey}`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <PageContainer
      title={`编排 Workspace: ${objectKey}`}
      extra={[
        <Button key="preview" onClick={handlePreview}>
          预览
        </Button>,
        <Button key="save" type="primary" onClick={handleSave} loading={saving}>
          保存配置
        </Button>,
      ]}
    >
      <Row gutter={16}>
        {/* 左侧：可用函数列表 */}
        <Col span={6}>
          <FunctionList functions={availableFunctions} />
        </Col>

        {/* 中间：布局设计器 */}
        <Col span={12}>
          <LayoutDesigner config={config} onChange={setConfig} />
        </Col>

        {/* 右侧：实时预览 */}
        <Col span={6}>
          <ConfigPreview config={config} />
        </Col>
      </Row>
    </PageContainer>
  );
}
